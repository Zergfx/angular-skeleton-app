import { Injectable } from "@angular/core";

import { environment } from "../../environments/environment";

@Injectable()
export class AppInfoService {
	title = "Angular Labz";
	version = "1.0.0";
	environment = environment.production ? "prod" : "dev";
	isDebug = environment.debug;
}