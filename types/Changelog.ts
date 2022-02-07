export interface CustomData {
    contentID: number;
    fields: Fields;
}
export interface Fields {
    date: string;
    description: string;
    changes?: ChangesEntity[] | null;
}
export interface ChangesEntity {
    contentID: number;
    properties: Properties;
    fields: Fields1;
}
export interface Properties {
    itemOrder: number;
}
export interface Fields1 {
    title: string;
    type: string;
    component: string;
    description?: string | null;
    linkURL?: null;
}
