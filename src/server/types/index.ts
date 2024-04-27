import { Utils } from '@strapi/types/dist/types';
import { Attribute as AttributeType, Common as StrapiCommon } from '@strapi/types';

import {
  Component as StrapiComponentSchema,
  SingleType as StrapiSingleTypeSchema,
  CollectionType as StrapiCollectionTypeSchema,
  Component as StrapiComponentValue,
} from '@strapi/types/dist/types/core/schemas';

import { DynamicZone as StrapiDynamicZoneAttribute } from '@strapi/types/dist/types/core/attributes/dynamic-zone';

import { Media as StrapiMediaAttribute, MediaValue as StrapiMediaValue } from '@strapi/types/dist/types/core/attributes/media';
import { Relation as StrapiRelationAttribute, RelationValue as StrapiRelationValue } from '@strapi/types/dist/types/core/attributes/relation';
interface StrapiComponentAttribute extends AttributeType.Attribute {
  type: 'component';
  component: string;
  repeatable?: boolean;
}

type DynamicZoneValue<TComponentsUID extends StrapiCommon.UID.Component[]> = Array<
  Utils.Array.Values<TComponentsUID> extends infer TComponentUID
    ? TComponentUID extends StrapiCommon.UID.Component
      ? AttributeType.GetValues<TComponentUID> & {
          __component: TComponentUID;
        }
      : never
    : never
>;

export type {
  Attribute,
  AttributeType,
  CollectionTypeSchema,
  ComponentAttribute,
  ComponentEntry,
  ComponentSchema,
  DynamicZoneAttribute,
  DynamicZoneEntry,
  Entry,
  EntryId,
  MediaAttribute,
  MediaEntry,
  RelationAttribute,
  RelationEntry,
  Schema,
  SchemaUID,
  SingleTypeSchema,
  User,
};

type SchemaUID = StrapiCommon.UID.ContentType;

type User = any;

type BaseAttribute = { name: string };
type Attribute = ComponentAttribute | DynamicZoneAttribute | MediaAttribute | RelationAttribute;
type ComponentAttribute = BaseAttribute & (StrapiComponentAttribute | StrapiComponentAttribute);
type DynamicZoneAttribute = BaseAttribute & StrapiDynamicZoneAttribute;
type MediaAttribute = BaseAttribute & StrapiMediaAttribute<'audios' | 'files' | 'images' | 'videos'>;
type RelationAttribute = BaseAttribute &
  (StrapiRelationAttribute<any, 'oneToOne'> | StrapiRelationAttribute<any, 'oneToMany'> | StrapiRelationAttribute<any, 'manyToOne'> | StrapiRelationAttribute<any, 'manyToMany'>);
// TODO: handle polymorphic relations
// | StrapiRelationAttribute<any, 'morphOne'>
// | StrapiRelationAttribute<any, 'morphMany'>
// | StrapiRelationAttribute<any, 'morphToOne'>
// | StrapiRelationAttribute<any, 'morphToMany'>

// Media are not included in type because equals any atm.
type Entry = ComponentEntry | DynamicZoneEntry | RelationEntry;
type ComponentEntry = (WithI18n<StrapiComponentValue> & EntryBase) | (WithI18n<StrapiComponentValue> & EntryBase);
type DynamicZoneEntry = WithI18n<UnwrapArray<DynamicZoneValue<[any]>>> & EntryBase;
type MediaEntry = StrapiMediaValue;
type RelationEntry =
  | (WithI18n<StrapiRelationValue<'oneToOne', any>> & EntryBase)
  | (WithI18n<StrapiRelationValue<'oneToMany', any>> & EntryBase)
  | (WithI18n<StrapiRelationValue<'manyToOne', any>> & EntryBase)
  | (WithI18n<StrapiRelationValue<'manyToMany', any>> & EntryBase);
// TODO: handle polymorphic relations
// | (WithI18n<StrapiRelationValue<'morphOne', any>> & EntryBase)
// | (WithI18n<StrapiRelationValue<'morphMany', any>> & EntryBase)
// | (WithI18n<StrapiRelationValue<'morphToOne', any>> & EntryBase)
// | (WithI18n<StrapiRelationValue<'morphToMany', any>> & EntryBase);
type EntryBase = { id: EntryId };
type EntryId = number | string;
type WithI18n<T> = UnwrapArray<T> & {
  localizations?: UnwrapArray<T>[];
  locale?: string;
};
type UnwrapArray<T> = T extends Array<infer U> ? U : T;

type Schema = CollectionTypeSchema | SingleTypeSchema | ComponentSchema;
type CollectionTypeSchema = StrapiCollectionTypeSchema & SchemaPluginOptions;
type SingleTypeSchema = StrapiSingleTypeSchema & SchemaPluginOptions;
type ComponentSchema = StrapiComponentSchema & { uid: SchemaUID } & SchemaPluginOptions;
type SchemaPluginOptions = {
  pluginOptions?: {
    'content-manager'?: {
      visible?: boolean;
    };
    'content-type-builder'?: {
      visible?: boolean;
    };
    i18n?: {
      localized?: true;
    };
    'import-export-entries'?: {
      idField?: string;
    };
  };
};
