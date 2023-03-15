import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";

import fs from "fs-extra";
import Helper from "./Helper";
import {Query} from "./Query";
import RoomDataSetHelper from "./RoomDataSetHelper";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
interface InsightDatabase {
	id: string;
	kind: InsightDatasetKind;
	data: any[];
}

export default class InsightFacade implements IInsightFacade {
	private helper: Helper;
	private datasets: Map<string, any>;
	constructor() {
		this.helper = new Helper();
		this.datasets = new Map<string, any[]>();
		this.readFromDisk();
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {

		return new Promise<string[]>((resolve, reject) => {
			// !id.trim() from https://stackoverflow.com/questions/10261986/how-to-detect-string-which-contains-only-spaces
			if ((kind !== "sections" && kind !== "rooms") || id === "" || id.includes("_") || !id.trim()) {
				reject(new InsightError("invalid ID"));
			}
			// check duplicate
			if (this.datasets.has(id)) {
				reject(new InsightError("Cannot add existing ID"));
			}
			// parse file
			if (kind === InsightDatasetKind.Rooms) {
				RoomDataSetHelper.process(content)
					.then((result) => {
						if (result.length === 0) {
							reject(new InsightError("invalid dataset"));
						}

						const value = {id:id, kind: InsightDatasetKind.Rooms, data: result};
						this.datasets.set(id, value);
						this.writeToDisk(id, value);
						resolve(Array.from(this.datasets.keys()));
					})
					.catch(() => {
						reject(new InsightError());
					});
			} else if (kind === InsightDatasetKind.Sections) {
				this.helper.processData(content)
					.then((result) => {
						if (result.length === 0) {
							reject(new InsightError("invalid dataset"));
						}

						let value = {id:id, kind: InsightDatasetKind.Sections, data: result};
						this.datasets.set(id, value);
						this.writeToDisk(id, value);
						resolve(Array.from(this.datasets.keys()));
					})
					.catch(() => {
						reject(new InsightError());
					});
			} else {
				throw new InsightError("Wrong InsightDatasetKind");
			}
		});
	}

	private writeToDisk(id: string, result: InsightDatabase) {
		let path = "./data";
		fs.ensureDirSync(path);
		fs.ensureFileSync("./data/" + id + ".json");
		fs.outputJSONSync("./data/" + id + ".json", JSON.stringify(result));
	}

	private readFromDisk() {
		let path = "./data";
		if (!fs.existsSync("./data")) {
			return;
		}
		let filenames = fs.readdirSync(path);
		filenames.forEach((file) => {
			const id = file.split(".")[0];
			const data = JSON.parse(fs.readJsonSync(path + "/" + file));
			this.datasets.set(id, {id:id, kind: data.kind, data: data.data});
		});


	}

	public removeDataset(id: string): Promise<string> {

		return new Promise<string>((resolve, reject) => {
			if (id === "" || id.includes("_") || !id.trim()) {
				reject(new InsightError("invalid ID"));
			} else if (!this.datasets.has(id)) {
				reject(new NotFoundError());
			} else {
				this.datasets.delete(id);
				fs.removeSync("./data " + id + ".json");
				resolve(id);
			}
		});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise((resolve, reject) => {
			try {
				const id: string = Query.validate(query);
				const data = this.datasets.get(id);

				if (!data) {
					throw new InsightError("No such dataset");
				}
				const result = Query.perform(query, data["data"], id);
				resolve(result);
			} catch (error) {
				reject(error);
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return new Promise((resolve) => {
			const InsightDatasets: InsightDataset[] = [];
			this.datasets.forEach((value: any, key: string) => {
				const insightData = {id: key, kind: value["kind"], numRows: value.data.length};
				InsightDatasets.push(insightData);
			});
			resolve(InsightDatasets);
		});
	}
}
