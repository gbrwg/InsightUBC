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
	private datasets: Map<string, any>;
	constructor() {
		this.helper = new Helper();
		this.datasets = new Map<string, any[]>();
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			// !id.trim() from https://stackoverflow.com/questions/10261986/how-to-detect-string-which-contains-only-spaces
			if (kind !== "sections" || id === "" || id.includes("_") || !id.trim()) {
				reject(new InsightError("invalid ID"));
			}
			// check duplicate
			if (this.datasets.has(id)) {
				reject(new InsightError("Cannot add existing ID"));
			}
			// parse file

			this.helper.processData(id, content, kind)
				.then((result) => {
					this.datasets.set(id, result);
					resolve(this.datasets.get(id));
				})
				.catch(() => {
					reject(new InsightError());
				});
		});
	}

	public removeDataset(id: string): Promise<string> {

		return new Promise<string>((resolve, reject) => {
			if (id === "" || id.includes("_") || !id.trim()) {
				reject(new InsightError("invalid ID"));
			} else if (!this.datasets.has(id)) {
				reject(new NotFoundError("Cannot delete non-existent ID"));
			} else {
				this.datasets.delete(id);
				resolve(id);
			}
		});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
