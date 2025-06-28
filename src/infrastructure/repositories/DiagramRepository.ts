import type { UmlDiagram } from '../../domain/entities/UmlDiagram';

export interface DiagramRepository {
  save(diagram: UmlDiagram): Promise<UmlDiagram>;
  findById(id: string): Promise<UmlDiagram | null>;
  findAll(): Promise<UmlDiagram[]>;
  delete(id: string): Promise<void>;
}

// In-memory implementation for development
export class InMemoryDiagramRepository implements DiagramRepository {
  private diagrams: Map<string, UmlDiagram> = new Map();

  async save(diagram: UmlDiagram): Promise<UmlDiagram> {
    const updatedDiagram = {
      ...diagram,
      updatedAt: new Date()
    };
    this.diagrams.set(diagram.id, updatedDiagram);
    return updatedDiagram;
  }

  async findById(id: string): Promise<UmlDiagram | null> {
    return this.diagrams.get(id) || null;
  }

  async findAll(): Promise<UmlDiagram[]> {
    return Array.from(this.diagrams.values());
  }

  async delete(id: string): Promise<void> {
    this.diagrams.delete(id);
  }
}