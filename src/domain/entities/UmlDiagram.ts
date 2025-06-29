import type {UmlElement} from './UmlElement';

export interface UmlDiagram {
  id: string;
  name: string;
  elements: UmlElement[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MermaidExport {
  code: string;
}

export interface CSharpExport {
  code: string;
}
