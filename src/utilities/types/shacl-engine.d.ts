declare module 'shacl-engine' {
	import { DatasetCore, DataFactory, Term } from '@rdfjs/types';

	interface ValidatorOptions {
		factory: DataFactory & { dataset(): DatasetCore };
		coverage?: boolean;
		debug?: boolean;
		details?: boolean;
		trace?: boolean;
		[key: string]: any;
	}

	interface ValidateOptions {
		dataset: DatasetCore;
	}

	interface ValidationResult {
		focusNode: any;
		severity: Term;
		constraintComponent: Term;
		message: Term[];
		path: any[];
		value: any;
		shape: { ptr: { term: Term } };
		results: ValidationResult[];
	}

	interface ValidationReport {
		conforms: boolean;
		dataset: DatasetCore;
		results: ValidationResult[];
	}

	export class Validator {
		constructor(shapes: DatasetCore, options: ValidatorOptions);
		validate(data: ValidateOptions): Promise<ValidationReport>;
	}
}
