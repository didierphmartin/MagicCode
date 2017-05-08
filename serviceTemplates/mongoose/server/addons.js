// return values
const OK = 0;
const ABORT = -1;

// class called before and after default processing
export class payment_addons {
    constructor() {}

// these class members are invoked respectively for
//    get, put, post delete before the default processing
// The content received is an object which can be modified accordingly to the
// the schema defined.
// To completely override the main processing by your own processing
// return ABORT
    getPreProcess(content){
        return content;
    }
    putPreProcess(content){
        return content;
    }
    postPreProcess(content){
        return content;
    }
    deletePreProcess(content){
        return content;
    }

    // samething as for Pre process but this time after the default processing
    getPostProcess(content){
        return OK;
    }
    putPostProcess(content){
        return OK;
    }
    postPostProcess(content){
        return OK;
    }
    deletPostProcess(content){
        return OK;
    }
}