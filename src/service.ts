import { Models, Repositories } from "@arkecosystem/core-database";
import { Container, Contracts, Enums as AppEnums, Providers, Utils } from "@arkecosystem/core-kernel";
import { Identities, Transactions } from "@arkecosystem/crypto";
import { chunk } from "@arkecosystem/utils";
import { ITransaction } from "@packages/crypto/dist/interfaces";

@Container.injectable()
export class Service {
    @Container.inject(Container.Identifiers.Application)
    private readonly app!: Contracts.Kernel.Application;

    @Container.inject(Container.Identifiers.DatabaseTransactionRepository)
    private readonly transactionRepository!: Repositories.TransactionRepository;

    @Container.inject(Container.Identifiers.EventDispatcherService)
    private readonly events!: Contracts.Kernel.EventDispatcher;

    @Container.inject(Container.Identifiers.LogService)
    private readonly logger!: Contracts.Kernel.Logger;

    @Container.inject(Container.Identifiers.PeerTransactionBroadcaster)
    private readonly transactionBroadcaster!: Contracts.P2P.TransactionBroadcaster;

    @Container.inject(Container.Identifiers.WalletRepository)
    @Container.tagged("state", "blockchain")
    private readonly walletRepository!: Contracts.State.WalletRepository;

    @Container.inject(Container.Identifiers.PluginConfiguration)
    @Container.tagged("plugin", "@dpos-info/core-auto-refunds")
    private readonly configuration!: Providers.PluginConfiguration;

    public async boot(): Promise<void> {
        this.events.listen(AppEnums.BlockEvent.Applied, {
            handle: async (data) => {
                await this.handleBlock(data);
            },
        });
    }

    private async handleBlock(data): Promise<void> {
        const openLocks: Array<Models.Transaction> = await this.transactionRepository.getOpenHtlcLocks();

        const matchingLocks = openLocks.filter(
            (lock) =>
                this.isMatched(lock.senderPublicKey, this.configuration.get("publicKeys") || []) &&
                Utils.expirationCalculator.calculateLockExpirationStatus(data, lock.asset.lock.expiration),
        );

        if (matchingLocks.length) {
            const refundWalletPublicKey = Identities.PublicKey.fromPassphrase(this.configuration.get("passphrase") as string);
            let nonce = this.walletRepository.findByPublicKey(refundWalletPublicKey).getNonce().plus(1);

            const transactions: Array<ITransaction> = [];

            for (const lock of matchingLocks) {
                transactions.push(
                    Transactions.BuilderFactory.htlcRefund()
                        .nonce(nonce.toFixed())
                        .senderPublicKey(refundWalletPublicKey)
                        .htlcRefundAsset({ lockTransactionId: lock.id })
                        .sign(this.configuration.get("passphrase") as string)
                        .build(),
                );

                nonce = nonce.plus(1);
            }

            const maxTransactionsPerRequest = this.app
                .getTagged<Providers.PluginConfiguration>(Container.Identifiers.PluginConfiguration, "plugin", "@arkecosystem/core-transaction-pool")
                .getOptional<number>("maxTransactionsPerRequest", 40);

            this.logger.info(`[@dpos-info/core-auto-refunds] Broadcasting ${transactions.length} HTLC Refund ${Utils.pluralize("transaction", transactions.length)}`);

            for (const batch of chunk(transactions, maxTransactionsPerRequest)) {
                await this.transactionBroadcaster.broadcastTransactions(batch);
            }
        }
    }

    private isMatched(value: string, publicKeys: Array<string>): boolean {
        return publicKeys.includes("*") || publicKeys.includes(value);
    }
}
