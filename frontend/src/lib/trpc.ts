import { createTRPCReact } from "@trpc/react-query";

const trpcBase = createTRPCReact<any>() as any;
export const trpc = trpcBase;
