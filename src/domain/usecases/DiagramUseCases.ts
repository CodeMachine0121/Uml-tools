import type {UmlDiagram, MermaidExport} from '../entities/UmlDiagram';
import type { Position, Size, UmlElement, UmlElementType } from '../entities/UmlElement';

export interface DiagramUseCases {
  createDiagram(name: string): UmlDiagram;
  addElement(diagramId: string, type: UmlElementType, position: Position, size?: Size, text?: string): UmlElement;
  updateElement(diagramId: string, elementId: string, updates: Partial<UmlElement>): UmlElement;
  removeElement(diagramId: string, elementId: string): void;
  connectElements(diagramId: string, sourceId: string, targetId: string, type: UmlElementType): UmlElement;
  addTextElement(diagramId: string, position: Position, text: string): UmlElement;
  exportToMermaid(diagramId: string): MermaidExport;
  importFromMermaid(code: string): UmlDiagram;
}