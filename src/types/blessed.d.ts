declare module 'blessed' {
  export type BlessedScreenOptions = {
    smartCSR?: boolean;
    fullUnicode?: boolean;
    title?: string;
    input?: NodeJS.ReadableStream | string | boolean;
    output?: NodeJS.WritableStream | string | boolean;
    term?: string;
    [key: string]: any;
  };

  type BlessedWidgetOptions = {
    parent?: any;
    label?: string;
    top?: number | string;
    left?: number | string;
    width?: number | string;
    height?: number | string;
    border?: any;
    style?: any;
    tags?: boolean;
    scrollable?: boolean;
    alwaysScroll?: boolean;
    mouse?: boolean;
    keys?: boolean;
    vi?: boolean;
    scrollbar?: any;
    [key: string]: any;
  };

  export interface BlessedScreen {
    destroy(): void;
    render(): void;
    focus(): void;
    key(keys: string | string[], callback: () => void): void;
    on(event: string, callback: (...args: any[]) => void): void;
    append(el: any): void;
    remove(el: any): void;
    [key: string]: any;
  }

  export interface BlessedListElement {
    select(index: number): void;
    setItems(items: string[]): void;
    get selected(): number | undefined;
    on(event: string, callback: (...args: any[]) => void): void;
    focus(): void;
    [key: string]: any;
  }

  export interface BlessedLog {
    log(msg: string): void;
    focus(): void;
    render(): void;
    [key: string]: any;
  }

  export interface BlessedBaseElement {
    focus(): void;
    render(): void;
    setContent(content: string): void;
    detach(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    [key: string]: any;
  }

  export interface BlessedTextboxElement extends BlessedBaseElement {
    on(event: string, callback: (...args: any[]) => void): void;
  }

  export interface BlessedFormElement extends BlessedBaseElement {
    focus(): void;
  }

  export interface BlessedBoxElement extends BlessedBaseElement {
    focus(): void;
  }

  export interface BlessedTextElement extends BlessedBaseElement {}

  export type BlessedScreenFactory = (options?: BlessedScreenOptions) => BlessedScreen;
  export type BlessedListFactory = (options?: BlessedWidgetOptions) => BlessedListElement;
  export type BlessedBoxFactory = (options?: BlessedWidgetOptions) => BlessedBoxElement;
  export type BlessedLogFactory = (options?: BlessedWidgetOptions) => BlessedLog;
  export type BlessedTextFactory = (options?: BlessedWidgetOptions) => BlessedTextElement;
  export type BlessedTextboxFactory = (options?: BlessedWidgetOptions) => BlessedTextboxElement;
  export type BlessedFormFactory = (options?: BlessedWidgetOptions) => BlessedFormElement;

  export const screen: BlessedScreenFactory;
  export const list: BlessedListFactory;
  export const box: BlessedBoxFactory;
  export const log: BlessedLogFactory;
  export const text: BlessedTextFactory;
  export const textbox: BlessedTextboxFactory;
  export const form: BlessedFormFactory;
}
