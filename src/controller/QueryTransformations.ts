import {InsightError} from "./IInsightFacade";
import {Key} from "./Query";
import {getKey, getValue} from "./QueryFilter";
import Decimal from "decimal.js";

export class Transformations{
	public static perform(query: any, data: any[]): any[] {
		const grouped = Group.perform(query["TRANSFORMATIONS"], data);
		const applied = Apply.perform(query["TRANSFORMATIONS"], grouped);
		return applied;
	}

	public static validate(query: any, ids: Set<string>, applyKeys: string[]) {
		const keys = Object.keys(query);

		if (keys.length !== 2) {
			throw new InsightError("TRANSFORMATIONS missing keys");
		}
		if (!(keys.includes("GROUP") && keys.includes("APPLY"))) {
			throw new InsightError("Transformations invalid");
		}
		Group.validate( {GROUP:query["GROUP"]}, ids );
		Apply.validate( {APPLY:query["APPLY"]}, ids, applyKeys );
	}

	public static validateOptionKeys(keys: string[], optQuery: any) {
		const bool: boolean = optQuery["COLUMNS"].every((c: string) => {
			return keys.includes(c);
		});

		if (!bool) {
			throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
		}
	}
}
class Group{
	public static perform(query: any, data: any[]): any {
		const groupKeys = query["GROUP"];
		const grouped: any = {};
		for (let d of data) {
			const groupedKeyPart: any = {};

			for (let k of groupKeys) {
				groupedKeyPart[k] = d[k];
			}
			const groupKey = JSON.stringify(groupedKeyPart);

			if (groupKey in grouped) {
				grouped[groupKey].push(d);
			} else {
				grouped[groupKey] = [d];
			}
		}
		return grouped;
	}

	public static validate(query: any, ids: Set<string>) {
		const keyList: any[] = query["GROUP"];
		const bool: boolean = keyList.every((key) => {
			return Key.isKey(key, ids);
		});

		if (!bool) {
			throw new InsightError("Group key invalid");
		}
	}
}

class Apply{
	public static perform(query: any, data: any): any[] {
		return Object.keys(data).map((groupKey) => {
			const group: any[] = data[groupKey];
			const applyRules: any[] = query["APPLY"];
			const result: any = {};

			for (const applyRule of applyRules) {
				Apply.performApply(applyRule, group, result);
			}
			return {...result, ...JSON.parse(groupKey)};
		});
	}

	private static performApply(rule: any, data: any[], result: any) {
		const newKey = getKey(rule);
		const appliedKey = getValue(getValue(rule));
		const applyMethod = getKey(getValue(rule));
		result[newKey] = Apply.performApplyMethod(data, appliedKey, applyMethod);
	}

	private static performApplyMethod(rawData: any[], appliedKey: string, method: string){
		const data = rawData.map((d: any) => {
			return d[appliedKey];
		});

		switch (method) {
			case "MAX":
				return Math.max(...data);
			case "MIN":
				return Math.min(...data);
			case "AVG":
				return Apply.average(data);
			case "COUNT":
				return new Set(data).size;
			case "SUM":
				return Number(Apply.sum(data).toFixed(2));
			default:
				throw new InsightError("Apply method is none of 'MAX' | 'MIN' | 'AVG' | 'COUNT' | 'SUM'");
		}
	}

	private static sum(data: number[]): number{
		return data.reduce((a: number, b: number) => {
			return a + b;
		});
	}

	public static validateKeyByApplyToken(key: string, token: string){
		if (["MAX", "MIN", "AVG", "SUM"].includes(token)) {
			if (!Key.isMKey(key, new Set())) {
				throw new InsightError("Given math apply method but key is not mkey");
			}
		}
		return true;
	}

	public static validate(query: any, ids: Set<string>, applyKeys: string[]) {
		const applyRules: any[] = query["APPLY"];
		applyRules.forEach((applyRule) => {
			const applyKey = getKey(applyRule);
			const value = getValue(applyRule);
			const applyToken = getKey(value);
			const key = getValue(value);

			if (ApplyToken.validate(applyToken) && Key.isKey(key, ids) && ApplyKey.validate(applyKey)
				&& Apply.validateKeyByApplyToken(key,applyToken)) {
				applyKeys.push(applyKey);
			} else {
				throw new InsightError("Something wrong with apply rule");
			}
		});
	}

	private static average(data: number[]) {
		const total: Decimal = data.map((d) => {
			return new Decimal(d);
		}).reduce((a: Decimal, b: Decimal) => {
			return a.add(b);
		});
		const avg = total.toNumber() / data.length;
		return Number(avg.toFixed(2));
	}
}

export class ApplyKey {
	public static validate(key: string) {
		return !key.includes("_");
	}

	public static isApplyKey(key: string, applyKeys: string[]) {
		return applyKeys.includes(key);
	}
}

class ApplyToken {
	public static validate(key: string) {
		return ["MAX" , "MIN" , "AVG" , "COUNT" , "SUM"].includes(key);
	}
}
