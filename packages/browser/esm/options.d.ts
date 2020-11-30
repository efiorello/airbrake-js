import * as request from 'request';
import { INotice } from './notice';
import { Processor } from './processor/processor';
declare type Reporter = (notice: INotice) => Promise<INotice>;
export interface IInstrumentationOptions {
    onerror?: boolean;
    fetch?: boolean;
    history?: boolean;
    console?: boolean;
    xhr?: boolean;
}
export interface IOptions {
    projectId: number;
    projectKey: string;
    environment?: string;
    host?: string;
    timeout?: number;
    keysBlocklist?: any[];
    /**
     * @deprecated use keysBlocklist
     */
    keysBlacklist?: any[];
    ignoreWindowError?: boolean;
    processor?: Processor;
    reporter?: Reporter;
    instrumentation?: IInstrumentationOptions;
    performanceStats?: boolean;
    request?: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
}
export {};
//# sourceMappingURL=options.d.ts.map