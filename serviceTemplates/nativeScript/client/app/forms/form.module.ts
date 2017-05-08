import { NgModule, NO_ERRORS_SCHEMA } from "@angular/core";
import { NativeScriptModule } from "nativescript-angular/nativescript.module";
import { NativeScriptRouterModule } from "nativescript-angular/router";
import { NativeScriptFormsModule} from "nativescript-angular/forms";
import { NativeScriptHttpModule } from "nativescript-angular/http";
import { FormMenu } from "./form.menu";
import { appForms, formRoutes} from "./form.routes"


@NgModule({
    declarations: [
        FormMenu,
        ...appForms
        ],
    imports: [
        NativeScriptRouterModule,
        NativeScriptFormsModule,
        NativeScriptHttpModule,
        NativeScriptRouterModule.forRoot(formRoutes)
    ],
    schemas: [NO_ERRORS_SCHEMA],
})
export class FormModule {}
