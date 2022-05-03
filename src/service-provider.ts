import { Container, Contracts, Providers } from "@arkecosystem/core-kernel";

import { Service } from "./service";

export class ServiceProvider extends Providers.ServiceProvider {
    @Container.inject(Container.Identifiers.LogService)
    private readonly logger!: Contracts.Kernel.Logger;

    private service = Symbol.for("Service<AutoRefunds>");

    public async register(): Promise<void> {
        if (!this.config().get("enabled")) {
            return;
        }

        this.logger.info("[@dpos-info/core-auto-refunds] Registering plugin");

        this.app.bind<Service>(this.service).to(Service).inSingletonScope();
    }

    public async bootWhen(): Promise<boolean> {
        if (!this.config().get("enabled")) {
            return false;
        }

        if (!this.config().get("passphrase")) {
            this.logger.error("[@dpos-info/core-auto-refunds] Passphrase is not configured");
            return false;
        }

        return true;
    }

    public async boot(): Promise<void> {
        this.logger.info("[@dpos-info/core-auto-refunds] Booting Plugin");

        this.app.get<Service>(this.service).boot();
    }
}
