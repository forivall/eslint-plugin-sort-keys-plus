import { Node } from 'estree'

type AllKeys<T> = T extends unknown ? keyof T : never;
type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
type _ExclusifyUnion<T, K extends PropertyKey> =
    T extends unknown ? T & Id<Partial<Record<Exclude<K, keyof T>, never>>> : never;
export type ExclusifyUnion<T> = _ExclusifyUnion<T, AllKeys<T>>;

declare module 'eslint' {
  interface SourceCode {
    getText(node?: import('estree').Node | import('estree').Comment, beforeCount?: number, afterCount?: number): string;
  }

  namespace Rule {
    interface RuleFixer {
      remove(nodeOrToken: import('estree').Comment | import('estree').Node | AST.Token): Fix;
    }
  }
}

declare module 'estree' {
  interface BaseNode {
    loc: SourceLocation;
  }
}

export type ASTNode = ExclusifyUnion<Node>;
type ASTNodesWithKey = Extract<Node, { key: any }>;
export type ASTPropertyKeyNode = ExclusifyUnion<ASTNodesWithKey['key']>;

export interface SortOrderOverride {
  message?: string;
  order: string[];
  /**
   * Name of parent property to apply this override to. If omitted, the
   * object's keys must be a total subset of the properties defined in order
   */
  properties?: string[];
}

interface SortRuleOptions {
  caseSensitive?: boolean;
  natural?: boolean;
  minKeys?: number;
  allowLineSeparatedGroups?: boolean;
  ignoreSingleLine?: boolean;
  allCaps?: 'first' | 'last' | 'ignore';
  overrides?: SortOrderOverride[];
}

export interface SortKeysOptions extends SortRuleOptions {
  shorthand?: 'first' | 'last' | 'ignore';
}
