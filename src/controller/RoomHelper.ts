import {
	InsightError

} from "./IInsightFacade";
import JSZip from "jszip";
import * as parse5 from "parse5";

interface Building {
	fullname: string;
	shortname: string;
	number: string;
	name: string;
	address: string,
	lat: number;
	lon: number;
	href: string;
	seats: number;
	type: string;
	furniture: string;
}
export default class RoomHelper {
	// private zip = new JSZip();
	public processRooms(content: string): Promise<any[]> {
		return new Promise<string[]>((resolve, reject) => {
			JSZip.loadAsync(content, {base64: true})
				.then((zip) => {
					// this.zip = zip;
					let indexFile = zip.file("index.htm");
					if (indexFile !== null) {
						indexFile.async("string").then((fileContent) => {
							let document = parse5.parse(fileContent);
							let buildings = this.parseIndex(document, zip);
							resolve(buildings);
						});
					} else {
						reject(new InsightError());
					}
				});
		});
	}

	// parse content inside index.htm
	public async parseIndex(document: any, zip: JSZip): Promise<any[]> {
		// stub
		let table = this.findNode(document, "tbody");
		if (table === 0) {
			throw new InsightError();
		}
		let rows = this.findNodes(table, "tr");
		let content = this.parseBuildingDetails(rows, zip);
		// this.getGeoLocation(content);


		return [];


	}

	public parseBuildingDetails(rows: any, zip: JSZip): Building[]{
		const buildingFilePaths = new Map<string, Building>();
		const result: Building[] = [];
		// for each row of index table
		for (const row of rows) {
			if (row.childNodes.length > 0) {
				let buildingDetails = this.findNodes(row, "td");
				this.getBuildingDetails(buildingDetails, buildingFilePaths);
				this.parseFiles(zip, buildingFilePaths).then((r) => {
					return result.push(...r);
				});

			}
		}
		return result;
	}

	// given list of nodes to rows, get the shortname, full name and address of each building
	private getBuildingDetails(buildingDetails: any[],
							   buildingFilePaths: Map<string, Building>): Map<string, Building> {
		let buildingFilePath: string = "";
		for (const td of buildingDetails) {
			let b: Building = {
				address: "",
				fullname: "",
				furniture: "",
				lat: 0,
				lon: 0,
				name: "",
				number: "",
				href: "",
				seats: 0,
				shortname: "",
				type: ""
			};
			buildingFilePath = this.getBuildingValues(td, b, buildingFilePath);
			if (buildingFilePath !== "") {
				buildingFilePaths.set(buildingFilePath, b);
			}
		}
		return buildingFilePaths;
	}

	private getBuildingValues(td: any, b: Building, buildingFilePath: string) {
		switch (td.attrs[0].value) {
			case "views-field views-field-field-building-code":
				for (const node of td.childNodes) {
					if (node.nodeName === "#text") {
						b.shortname = node.value;
						break;
					}
				}
				break;

			case "views-field views-field-title":
				for (const node of td.childNodes) {
					if (node.nodeName === "a") {
						for (const name of node.childNodes) {
							if (node.nodeName === "text") {
								b.fullname = node.value;
								break;
							}
						}
						for (const attr of node.attrs) {
							if (attr.name === "href") {
								buildingFilePath = attr.value;
								break;
							}
						}
					}
				}
				break;

			case "views-field views-field-field-building-address":
				for (const node of td.childNodes) {
					if (node.nodeName === "text") {
						b.address = node.value;
						break;
					}
				}
				break;
			default:
				break;
		}
		return buildingFilePath;
	}

// Parses all the files and return a list of buildings
	public async parseFiles(zip: JSZip, building: Map<string, Building>): Promise<Building[]> {
		let result: Building[] = [];
		// let buildingPaths: any[];

		// get all building files
		let files = await this.getBuildingFiles(building, zip);
		// let documents = this.parseBuildingFiles(files);
		let curr = 0;

		for (let file of files) {
			let buildings = Array.from(building.keys());
			let value = building.get(buildings[curr]);
			if (value !== undefined) {
				let document = parse5.parse(file);
				let tbody = this.findNode(document, "tbody");
				let rows = this.findNodes(tbody, "tr");
				let tds = this.findNodes(rows, "td");
				this.parseRoomDetails(tds, value, result);
			}
			curr++;
		}
		return Promise.all(result);
	}

	private getBuildingFiles(building: Map<string, Building>, zip: JSZip): Promise<string[]>{
		const paths = Array.from(building.keys());
		const promises = paths.map((path) => {
			const file = zip.file(path);
			if (file !== null) {
				return file.async("string");
			}
			return Promise.reject(new Error(`File not found: ${path}`));
		});
		return Promise.all(promises);
	}

	private parseRoomDetails(tds: any, value: Building, res: Building[]) {
		// loop through each column and get href, number, seats, furniture, and number
		for (const td of tds) {
			for (const attr of td.attrs) {
				if (attr.name === "class") {
					for (const childNodes of td.childNodes) {
						this.getRoomDetails(childNodes, attr, value);
					}
				}
			}
			res.push(value);
		}
	}

	private getRoomDetails(childNodes: any, attr: any, value: Building) {
		switch (attr.value) {
			case "views-field views-field-field-room-number":
				if (childNodes.nodeName === "a") {
					for (let a of childNodes.attrs) {
						if (a === "href") {
							value.href = a.value;
						}
					}
					for (let text of childNodes.childNodes) {
						if (text.nodeName === "#text") {
							value.number = text.value;
							break;
						}
					}
				}
				break;
			case "views-field views-field-field-room-capacity":
				if (childNodes.nodeName === "#text") {
					value.seats = childNodes.value.trim();
				}
				break;
			case "views-field views-field-field-room-furniture":
				if (childNodes.nodeName === "#text") {
					value.furniture = childNodes.value.trim();
				}
				break;
			case "views-field views-field-field-room-type":
				if (childNodes.nodeName === "#text") {
					value.type = childNodes.value.trim();
				}
				break;
			default:
				break;
		}
	}

	// https://stackoverflow.com/questions/67591100/how-to-parse-with-parse5
	public findNode(node: any, tag: string): any {
		for (let i = 0; i < node.childNodes?.length; i++) {
			// if child nodes of nodes has tag matching needed tag, return the corresponding node
			if (node.childNodes[i].tagName === tag) {
				return node.childNodes[i];
			}
			// else recurse on the child nodes
			let result: any;
			result = this.findNode(node.childNodes[i], tag);
			if (result) {
				return result;
			}
		}
		return 0;

	}

	private findNodes(node: any, tag: string): any[] {
		let matchingNodes: any[] = [];
		for (let i = 0; i < node.childNodes?.length; i++) {
			// if child nodes of nodes has tag matching needed tag, add the node to the array of matching nodes
			if (node.childNodes[i].tagName === tag) {
				matchingNodes.push(node.childNodes[i]);
			}
			// else recurse on the child nodes and add any matching nodes to the array
			let childMatchingNodes = this.findNodes(node.childNodes[i], tag);
			if (childMatchingNodes.length > 0) {
				matchingNodes.push(...childMatchingNodes);
			}
		}
		return matchingNodes;


	}
}
