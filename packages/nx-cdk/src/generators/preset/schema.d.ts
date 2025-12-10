/* v8 ignore start */
export interface PresetGeneratorSchema {
    name: string;
    nodeVersion: string;
    // FIXME: [MI-281] Add this into schema.json once we move to our own cli tool
    destination?: string;
}
