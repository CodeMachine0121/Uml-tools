export enum UmlElementType {
  CLASS = 'class',
  INTERFACE = 'interface',
  DEPENDENCY_ARROW = 'dependency',
  IMPLEMENTATION_ARROW = 'implementation',
  INHERITANCE_ARROW = 'inheritance',
  ASSOCIATION_ARROW = 'association',
  TEXT = 'text'
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface UmlElement {
  id: string;
  type: UmlElementType;
  position: Position;
  size?: Size;
  text?: string;
  properties?: Record<string, any>;
}

export interface UmlNode extends UmlElement {
  size: Size;
}

export interface UmlArrow extends UmlElement {
  source: string; // ID of source element
  target: string; // ID of target element
  points?: Position[]; // Control points for the arrow
}

export interface UmlText extends UmlElement {
  text: string;
}