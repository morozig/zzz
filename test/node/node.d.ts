declare module "chai" {
    export function expect(subject: any): any;
}

declare function describe(subject: string, test: () => any)
declare function it(subject: string, action: () => any)