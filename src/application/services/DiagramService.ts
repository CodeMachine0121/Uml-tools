import  { v4 as uuidv4 } from 'uuid';
import type { DiagramUseCases } from '@/domain/usecases/DiagramUseCases.ts';
import type { UmlDiagram, MermaidExport, CSharpExport } from '@/domain/entities/UmlDiagram.ts';
import type { Position, Size, UmlElement, UmlArrow, UmlText } from '@/domain/entities/UmlElement.ts';
import { UmlElementType } from '@/domain/entities/UmlElement.ts';
import type { DiagramRepository } from '@/infrastructure/repositories/DiagramRepository.ts';

export class DiagramService implements DiagramUseCases {
  constructor(private repository: DiagramRepository) {}

  createDiagram = async (name: string): Promise<UmlDiagram> => {
    const newDiagram: UmlDiagram = {
      id: uuidv4(),
      name,
      elements: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.repository.save(newDiagram);
  };

  findById = async (id: string): Promise<UmlDiagram | null> => {
    return await this.repository.findById(id) as UmlDiagram;
  }

  addElement = async (diagramId: string, type: UmlElementType, position: Position, size?: Size, text?: string): Promise<UmlElement> => {
    const diagram = await this.repository.findById(diagramId);
    if (!diagram) {
      throw new Error(`Diagram with id ${diagramId} not found`);
    }

    const newElement: UmlElement = {
      id: uuidv4(),
      type,
      position,
      size,
      text,
      properties: {}
    };

    diagram.elements.push(newElement);
    await this.repository.save(diagram);
    return newElement;
  };

  updateElement = async (diagramId: string, elementId: string, updates: Partial<UmlElement>): Promise<UmlElement> => {
    const diagram = await this.repository.findById(diagramId);
    if (!diagram) {
      throw new Error(`Diagram with id ${diagramId} not found`);
    }

    const elementIndex = diagram.elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) {
      throw new Error(`Element with id ${elementId} not found in diagram ${diagramId}`);
    }

    var currentElement: UmlElement= diagram.elements[elementIndex] as UmlElement;

    if (updates.type) currentElement.type = updates.type;
    if ('position' in updates && updates.position) {
      // 确保位置更新被正确应用
      currentElement.position = { 
        x: updates.position.x, 
        y: updates.position.y 
      };
    }
    if ('size' in updates) currentElement.size = updates.size;
    if ('text' in updates) currentElement.text = updates.text;
    if (updates.properties) currentElement.properties = updates.properties;

    await this.repository.save(diagram);

    return currentElement;
  };

  async removeElement(diagramId: string, elementId: string): Promise<void> {
    const diagram = await this.repository.findById(diagramId);
    if (!diagram) {
      throw new Error(`Diagram with id ${diagramId} not found`);
    }

    diagram.elements = diagram.elements.filter(el => el.id !== elementId);
    await this.repository.save(diagram);
  }

  async connectElements(diagramId: string, sourceId: string, targetId: string, type: UmlElementType): Promise<UmlElement> {
    const diagram = await this.repository.findById(diagramId);
    if (!diagram) {
      throw new Error(`Diagram with id ${diagramId} not found`);
    }

    const sourceElement = diagram.elements.find(el => el.id === sourceId);
    const targetElement = diagram.elements.find(el => el.id === targetId);

    if (!sourceElement || !targetElement) {
      throw new Error('Source or target element not found');
    }

    const newArrow: UmlArrow = {
      id: uuidv4(),
      type,
      position: { x: 0, y: 0 }, // Will be calculated by the UI
      source: sourceId,
      target: targetId
    };

    diagram.elements.push(newArrow);
    await this.repository.save(diagram);
    return newArrow;
  }

  async addTextElement(diagramId: string, position: Position, text: string): Promise<UmlElement> {
    const diagram = await this.repository.findById(diagramId);
    if (!diagram) {
      throw new Error(`Diagram with id ${diagramId} not found`);
    }

    const newText: UmlText = {
      id: uuidv4(),
      type: UmlElementType.TEXT,
      position,
      text
    };

    diagram.elements.push(newText);
    await this.repository.save(diagram);
    return newText;
  }

  async exportToMermaid(diagramId: string): Promise<MermaidExport> {
    const diagram = await this.repository.findById(diagramId);
    if (!diagram) {
      throw new Error(`Diagram with id ${diagramId} not found`);
    }

    // This is a simplified implementation
    // A real implementation would convert the UML elements to Mermaid syntax
    let mermaidCode = 'classDiagram\n';

    // Process classes and interfaces
    diagram.elements.forEach(element => {
      if (element.type === UmlElementType.CLASS && element.text) {
        mermaidCode += `  class ${element.text}\n`;
      } else if (element.type === UmlElementType.INTERFACE && element.text) {
        mermaidCode += `  class ${element.text} {\n    <<interface>>\n  }\n`;
      }
    });

    // Process relationships
    diagram.elements.forEach(element => {
      if ('source' in element && 'target' in element) {
        const arrow = element as UmlArrow;
        const source = diagram.elements.find(e => e.id === arrow.source);
        const target = diagram.elements.find(e => e.id === arrow.target);

        if (source?.text && target?.text) {
          let relationSymbol: string;

          switch (arrow.type) {
            case UmlElementType.INHERITANCE_ARROW:
              relationSymbol = '--|>';
              break;
            case UmlElementType.IMPLEMENTATION_ARROW:
              relationSymbol = '..|>';
              break;
            case UmlElementType.DEPENDENCY_ARROW:
              relationSymbol = '..>';
              break;
            case UmlElementType.ASSOCIATION_ARROW:
              relationSymbol = '-->';
              break;
            default:
              relationSymbol = '-->';
          }

          mermaidCode += `  ${source.text} ${relationSymbol} ${target.text}\n`;
        }
      }
    });

    return { code: mermaidCode };
  }

  async importFromMermaid(code: string): Promise<UmlDiagram> {
    // This is a simplified implementation
    // A real implementation would parse the Mermaid syntax and create UML elements

    const newDiagram: UmlDiagram = {
      id: uuidv4(),
      name: 'Imported Diagram',
      elements: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Basic parsing of class definitions
    const classRegex = /class\s+(\w+)/g;
    let match;
    let yPosition = 100;

    while ((match = classRegex.exec(code)) !== null) {
      const className = match[1];
      newDiagram.elements.push({
        id: uuidv4(),
        type: UmlElementType.CLASS,
        position: { x: 200, y: yPosition },
        size: { width: 150, height: 100 },
        text: className
      });
      yPosition += 150;
    }

    // Basic parsing of relationships
    const relationRegex = /(\w+)\s+(--|..|>|..>|-->)\s+(\w+)/g;

    while ((match = relationRegex.exec(code)) !== null) {
      const sourceName = match[1];
      const relationSymbol = match[2];
      const targetName = match[3];

      const sourceElement = newDiagram.elements.find(e => e.text === sourceName);
      const targetElement = newDiagram.elements.find(e => e.text === targetName);

      if (sourceElement && targetElement) {
        let arrowType: UmlElementType;

        switch (relationSymbol) {
          case '--|>':
            arrowType = UmlElementType.INHERITANCE_ARROW;
            break;
          case '..|>':
            arrowType = UmlElementType.IMPLEMENTATION_ARROW;
            break;
          case '..>':
            arrowType = UmlElementType.DEPENDENCY_ARROW;
            break;
          case '-->':
          default:
            arrowType = UmlElementType.ASSOCIATION_ARROW;
        }

        newDiagram.elements.push({
          id: uuidv4(),
          type: arrowType,
          position: { x: 0, y: 0 },
          source: sourceElement.id,
          target: targetElement.id
        } as UmlArrow);
      }
    }

    return this.repository.save(newDiagram);
  }

  async exportToCSharp(diagramId: string): Promise<CSharpExport> {
    const diagram = await this.repository.findById(diagramId);
    if (!diagram) {
      throw new Error(`Diagram with id ${diagramId} not found`);
    }

    // This is a simplified implementation
    // A real implementation would convert the UML elements to C# code
    let csharpCode = '';

    // Process classes and interfaces
    diagram.elements.forEach(element => {
      if (element.type === UmlElementType.CLASS && element.text) {
        csharpCode += `public class ${element.text}\n{\n    // Class properties and methods\n}\n\n`;
      } else if (element.type === UmlElementType.INTERFACE && element.text) {
        csharpCode += `public interface ${element.text}\n{\n    // Interface methods\n}\n\n`;
      }
    });

    // Process relationships
    diagram.elements.forEach(element => {
      if ('source' in element && 'target' in element) {
        const arrow = element as UmlArrow;
        const source = diagram.elements.find(e => e.id === arrow.source);
        const target = diagram.elements.find(e => e.id === arrow.target);

        if (source?.text && target?.text) {
          switch (arrow.type) {
            case UmlElementType.INHERITANCE_ARROW:
              // Add inheritance comment
              csharpCode += `// ${source.text} inherits from ${target.text}\n`;
              break;
            case UmlElementType.IMPLEMENTATION_ARROW:
              // Add implementation comment
              csharpCode += `// ${source.text} implements ${target.text}\n`;
              break;
            case UmlElementType.DEPENDENCY_ARROW:
              // Add dependency comment
              csharpCode += `// ${source.text} depends on ${target.text}\n`;
              break;
            case UmlElementType.ASSOCIATION_ARROW:
              // Add association comment
              csharpCode += `// ${source.text} is associated with ${target.text}\n`;
              break;
          }
        }
      }
    });

    return { code: csharpCode };
  }

  async importFromCSharp(code: string): Promise<UmlDiagram> {
    // This is a simplified implementation
    // A real implementation would parse the C# code and create UML elements

    const newDiagram: UmlDiagram = {
      id: uuidv4(),
      name: 'Imported C# Diagram',
      elements: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Basic parsing of class definitions
    const classRegex = /class\s+(\w+)/g;
    let match;
    let yPosition = 100;

    while ((match = classRegex.exec(code)) !== null) {
      const className = match[1];
      newDiagram.elements.push({
        id: uuidv4(),
        type: UmlElementType.CLASS,
        position: { x: 200, y: yPosition },
        size: { width: 150, height: 100 },
        text: className
      });
      yPosition += 150;
    }

    // Basic parsing of interface definitions
    const interfaceRegex = /interface\s+(\w+)/g;

    while ((match = interfaceRegex.exec(code)) !== null) {
      const interfaceName = match[1];
      newDiagram.elements.push({
        id: uuidv4(),
        type: UmlElementType.INTERFACE,
        position: { x: 400, y: yPosition },
        size: { width: 150, height: 100 },
        text: interfaceName
      });
      yPosition += 150;
    }

    // Basic parsing of inheritance relationships
    const inheritanceRegex = /class\s+(\w+)\s*:\s*(\w+)/g;

    while ((match = inheritanceRegex.exec(code)) !== null) {
      const childClass = match[1];
      const parentClass = match[2];

      const childElement = newDiagram.elements.find(e => e.text === childClass);
      const parentElement = newDiagram.elements.find(e => e.text === parentClass);

      if (childElement && parentElement) {
        newDiagram.elements.push({
          id: uuidv4(),
          type: UmlElementType.INHERITANCE_ARROW,
          position: { x: 0, y: 0 },
          source: childElement.id,
          target: parentElement.id
        } as UmlArrow);
      }
    }

    return this.repository.save(newDiagram);
  }
}
