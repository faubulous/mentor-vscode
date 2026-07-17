declare module 'shacl-engine' {
	import { DatasetCore, DataFactory, Term } from '@rdfjs/types';

	export interface ValidatorOptions {
		factory: DataFactory & { dataset(): DatasetCore };
		coverage?: boolean;
		debug?: boolean;
		details?: boolean;
		trace?: boolean;
		[key: string]: any;
	}

	export interface ValidateOptions {
		dataset: DatasetCore;
	}

	/**
	 * A node in a validation result that is either a plain RDF/JS term or a
	 * grapoi pointer wrapping one; shacl-engine emits both shapes depending on
	 * the constraint, so consumers read `term?.value ?? value`.
	 */
	export interface TermOrPointer {
		term?: Term;
		value?: string;
	}

	export interface ValidationResult {
		focusNode: TermOrPointer | null;
		severity: Term | null;
		constraintComponent: Term | null;
		message: Term[] | null;
		path: { predicates: Term[] }[] | null;
		value: TermOrPointer | null;
		shape: { ptr: { term: Term } } | null;
		results: ValidationResult[];
	}

	export interface ValidationReport {
		conforms: boolean;
		dataset: DatasetCore;
		results: ValidationResult[];
	}

	export class Validator {
		constructor(shapes: DatasetCore, options: ValidatorOptions);
		validate(data: ValidateOptions): Promise<ValidationReport>;
	}
}
