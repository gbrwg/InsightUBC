import RoomHelper from "./RoomHelper";

import http from "http";
import {Rooms} from "./Rooms";

export class GeoLocation {
	public getGeoLocation(buildings: Rooms[]) {
		for (const b of buildings) {
			if (b.address !== undefined) {
				const url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team041/" +
					encodeURIComponent(b.address);
				http.get(url, (res) => {
					let rawData = "";
					res.on("data", (chunk) => {
						rawData += chunk;
					});
					res.on("end", () => {
						try {
							const parsedData = JSON.parse(rawData);
							console.log(parsedData);
						} catch (e: any) {
							console.error(e.message);
						}
					});
				}).on("error", (e) => {
					console.error(`Got error: ${e.message}`);
				});
			}

		}
	}

}
