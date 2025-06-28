import type {UmlDiagram, MermaidExport} from '../entities/UmlDiagram';
import type { Position, Size, UmlElement, UmlElementType } from '../entities/UmlElement';

export interface DiagramUseCases {
  createDiagram(name: string): Promise<UmlDiagram>;
  addElement(diagramId: string, type: UmlElementType, position: Position, size?: Size, text?: string): Promise<UmlElement>;
  updateElement(diagramId: string, elementId: string, updates: Partial<UmlElement>): Promise<UmlElement>;
  removeElement(diagramId: string, elementId: string): void;
  connectElements(diagramId: string, sourceId: string, targetId: string, type: UmlElementType): Promise<UmlElement>;
  addTextElement(diagramId: string, position: Position, text: string): Promise<UmlElement>;
  exportToMermaid(diagramId: string): Promise<MermaidExport>;
  importFromMermaid(code: string): Promise<UmlDiagram>;
}