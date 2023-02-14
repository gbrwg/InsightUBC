import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import JSZip from "jszip";

export default class Helper {
	public async processData(content: string): Promise<string[]> {
		let zip: JSZip = await JSZip.loadAsync(content, {base64: true});
		let data: any[] = [];
		// https://stackoverflow.com/questions/39939644/jszip-checking-if-a-zip-folder-contains-a-specific-file
		if (zip.folder(/courses/).length > 0) {
			data = await this.getZipFilesContent(zip);
		} else {
			throw new InsightError();
		}

		let json = await this.getJSON(data);
		// https://stackoverflow.com/questions/43118692/typescript-filter-out-nulls-from-an-array
		const filteredArray: any[] = json.filter((s): s is string => Boolean(s));

		return Promise.resolve(filteredArray);

	}

	private getZipFilesContent(zip: JSZip): Promise<string[]>{
		let files: Array<Promise<string>> = [];
		zip.forEach((relativePath, file) => {
			files.push(file.async("text"));
		});

		return Promise.all(files);
	}

	private getJSON(data: string[]): Promise<any[]> {
		let sections: any[] = [];
		return Promise.all(
			data.map((file, index) => {
				if (index === 0 || file === "") {
					return;
				} else {
					const res = JSON.parse(file).result;
					const fileSections = [];
					for (const r of res) {
						fileSections.push({
							uuid: String(r.id),
							id: r.course,
							title: r.Title,
							instructor: r.Professor,
							dept: r.Subject,
							avg: r.Avg,
							pass: r.Pass,
							fail: r.Fail,
							audit: r.Audit,
							year: r.Section === "overall" ? 1900 : Number(r.year),
						});
					}
					return fileSections;
				}
			})
		).then((results) => {
			for (const result of results) {
				sections = sections.concat(result);
			}
			return sections;
		});
	}

}
