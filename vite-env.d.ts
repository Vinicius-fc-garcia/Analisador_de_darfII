// Fix: Removed reference to vite/client as the type definition file could not be found.
// /// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}