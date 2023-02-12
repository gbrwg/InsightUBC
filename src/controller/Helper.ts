import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import JSZip, {JSZipObject} from "jszip";
import Section from "./Section";

interface Dataset{
	id: string;
	data: Section[];
	kind: InsightDatasetKind;
	numRows: number;
}

export default class Helper {
	public async processData(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let zip: JSZip = await JSZip.loadAsync(content, {base64: true});
		let data: any[] = [];
		// https://stackoverflow.com/questions/39939644/jszip-checking-if-a-zip-folder-contains-a-specific-file
		if (zip.folder(/courses/).length > 0) {
			data = await this.getZip(zip);
		} else {
			throw new InsightError();
		}

		return Promise.resolve([]);

	}


	public async getZip(zip: JSZip): Promise<Section[]>{
		let files: any[] = [];
		zip.forEach((relativePath, file) => {
			files.push(file.async("text"));
		});

		return Promise.resolve(files);
	}


}
