import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";

import JSZip from "jszip";
import fs, {readFileSync} from "fs";
import Helper from "./Helper";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private helper: Helper;
	constructor() {
		this.helper = new Helper();
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			// !id.trim() from https://stackoverflow.com/questions/10261986/how-to-detect-string-which-contains-only-spaces
			if (kind !== "sections" || id === "" || id.includes("_") || !id.trim()) {
				reject(new InsightError());
			}

			// check duplicate

			// parse file
			this.helper.processData(id, content, kind)
				.then((result) =>
					resolve(result))
				.catch((error) =>
					reject(error));

			reject("Not implemented.");
		});
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
