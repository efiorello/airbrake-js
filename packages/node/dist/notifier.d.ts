import { BaseNotifier, INotice, IOptions } from '@airbrake/browser';
import { Scope, ScopeManager } from './scope';
export declare class Notifier extends BaseNotifier {
    _inFlight: number;
    _scopeManager: ScopeManager;
    _mainScope: Scope;
    constructor(opt: IOptions);
    scope(): Scope;
    setActiveScope(scope: Scope): void;
    notify(err: any): Promise<INotice>;
    flush(timeout?: number): Promise<boolean>;
    _instrument(): void;
}
//# sourceMappingURL=notifier.d.ts.map