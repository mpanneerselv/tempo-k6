import { type Options } from "k6/options";

declare module "k6/options" {
  interface Options {
    tlsConfig?: {
      cert: string;
      key: string;
    };
  }
}
