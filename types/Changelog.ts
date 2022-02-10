export interface CustomDataProp {
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
    tags: {
        contentID: number;
        fields: {
            title: string;
        };
    }[];
}

export interface ChangeLogTagsProp {
    contentID: number;
    fields: {
        title: string
    };
}

export interface ChangeLogProp {
    module: any;
    customData: {
        changelog: CustomDataProp[];
        changelogtags: ChangeLogTagsProp[];
    };
}