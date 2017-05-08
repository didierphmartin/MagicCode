import { Injectable } from '@angular/core';
import { Http, Headers, Response, RequestOptions } from "@angular/http";
import { Observable as RxObservable } from "rxjs/Observable";
import "rxjs/add/operator/map";

{{#each collections}}

{{#if methods}}
@Injectable()
//---------------------------------
// data class
//---------------------------------
export class  {{tsClassPropertyName this.name}} {
{{#each model}}
    public {{@key}}: {{tsPropertyType this}}{{#if @last}}{{else}}; {{/if}}
{{/each}}

    constructor(private http: Http) {}

    private serverUrl: string = "{{path}}";

    public read(id): any {
    {{#if methods.get}}
        let options = this.createRequestOptions();
        return this.http.get(this.serverUrl + "/" + id, options)
            .map(res => res.json());
    {{else}}
        return false;
    {{/if}}
    }

    public save(id,data): any {
    {{#if methods.post}}
        let options = this.createRequestOptions();
        return this.http.post(this.serverUrl + "/" + id, data, options)
            .map(res => res.json());
    {{else}}
        return false;
    {{/if}} 
    }

    public update(id, data): any {
    {{#if method.put}}
        this.save(id, data);
    {{else}}
        return false;
    {{/if}}
    }

    public remove(id): any {
    {{#if methods.delete}}
        let options = this.createRequestOptions();
        return this.http.delete(this.serverUrl + "/" + id, {}, options)
            .map(res => res.json());
    {{else}}
        return false;
    {{/if}}
    }

     private createRequestOptions() {
        let headers = new Headers();
        headers.append("AuthKey", "my-key");
        headers.append("AuthToken", "my-token");
        headers.append("Content-Type", "application/json");
        let options = new RequestOptions({ headers: headers });
        return options;
    }
}
{{/if}}
{{/each}}
