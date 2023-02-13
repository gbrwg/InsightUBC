import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import {
	QueryFilter,
	getKey,
	getValue
} from "./QueryFilter";

export class Query {
	public static perform(query: any, data: any[]): any[] {
		const qData: any[] = Body.perform(query, data);

		if (qData.length > 5000) {
			throw new ResultTooLargeError("Result length is larger than 5000, " +
				"the length is " + qData.length.toString());
		}

		const result = Options.perform(query, qData);
		return result;
	}

	public static validate(query: any): void {
		if (!(Object.keys(query).length === 2 && "WHERE" in query && "OPTIONS" in query)) {
			throw new InsightError("Something wrong with WHERE and OPTIONS");
		}
		Body.validate( {WHERE: query["WHERE"]} );
		Options.validate(query["OPTIONS"]);
	}
}

class Body {
	public static perform(query: any, data: any[]): any[] {
		return QueryFilter.perform(query["WHERE"], data);
	}

	public static validate(query: any): void {
		const key = getKey(query);

		if (key !== "WHERE") {
			throw new InsightError("Body error: " + JSON.stringify(query));
		}
		QueryFilter.validate(getValue(query));
	}
}

class Options {
	public static perform(query: any, data: any[]): any[] {
		const columns = Columns.perform( {COLUMNS: query["OPTIONS"]["COLUMNS"]}, data );
		const keys: string[] = Object.keys(query);

		if (keys.includes("ORDER")) {
			return Order.perform(query, columns);
		} else {
			return columns;
		}
	}

	public static validate(query: any): void {
		const keys: string[] = Object.keys(query);

		if (keys.length === 2 && keys.includes("COLUMNS") && keys.includes("ORDER")) {
			Columns.validate( {COLUMNS: query["COLUMNS"]} );
			Order.validate( {ORDER: query["ORDER"]}, query["COLUMNS"] );
		} else if (keys.length === 1 && keys.includes("COLUMNS")) {
			Columns.validate( {COLUMNS: query["COLUMNS"]} );
		} else {
			throw new InsightError("Options error: " + JSON.stringify(query));
		}
	}
}

class Columns {
	public static perform(query: any, data: any[]): any[] {
		const val: string[] = getValue(query);
		return data.map((x: any) => {
			const result: any = {};
			val.forEach((key) => {
				Key.isKey(key);
				const field = key.split("_")[1];
				result[key] = x[field];
			});
			return result;
		});
	}

	public static validate(query: any): void {
		const val: string[] = getValue(query);
		const x = val.map((key) => {
			return Key.isKey(key);
		}).every((v) => {
			return v;
		});

		if (!x) {
			throw new InsightError("Columns error: " + JSON.stringify(query));
		}
	}
}

class Order {
	public static perform(query: any, data: any[]): any[] {
		const val = getValue(query);
		return data.sort((a: any, b: any) => {
			const valA = a[val];
			const valB = b[val];

			if (typeof valA !== "number") {
				return valA.localeCompare(b);
			}
			return valA - valB;
		});
	}

	public static validate(query: any, columnKeys: string[]): void {
		const key = getValue(query);

		if (!(columnKeys.includes(key))) {
			throw new InsightError("Order error: " + JSON.stringify(query));
		}
	}
}

class Key {
	public static isKey(key: string): boolean {
		return this.isMKey(key) || this.isSKey(key);
	}

	private static isMKey(key: string): boolean {
		const parts = key.split("_");
		if (parts.length !== 2) {
			throw new InsightError("Key error");
		}

		const idStr = parts[0];
		const sField = parts[1];

		return ["avg", "pass", "fail", "audit", "year"].includes(sField);
	}

	private static isSKey(key: string): boolean {
		const parts = key.split("_");
		if (parts.length !== 2) {
			throw new InsightError("Key error");
		}

		const idStr = parts[0];
		const sField = parts[1];

		return ["dept", "id", "instructor", "title", "uuid"].includes(sField);
	}
}
