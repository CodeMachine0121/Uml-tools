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
    // 解析属性和方法
    const propertyRegex = /\s*(public|private|protected)\s+(\w+)\s+(\w+)\s*{\s*get;\s*set;\s*}/g;
    const methodRegex = /\s*(public|private|protected)\s+(\w+)\s+(\w+)\s*\([^)]*\)/g;

    // 为每个已添加的类添加属性和方法
    newDiagram.elements.forEach(element => {
      if (element.type === UmlElementType.CLASS || element.type === UmlElementType.INTERFACE) {
        if (!element.properties) {
          element.properties = { attributes: [], methods: [] };
        }

        // 查找此类或接口的代码块
        const classRegex = new RegExp(`(class|interface)\\s+${element.text}[^{]*{([\\s\\S]*?)}`, 'g');
        let classMatch;

        while ((classMatch = classRegex.exec(code)) !== null) {
          const classBody = classMatch[2];

          // 查找属性
          let propMatch;
          while ((propMatch = propertyRegex.exec(classBody)) !== null) {
            const visibility = propMatch[1].toLowerCase();
            const type = propMatch[2];
            const name = propMatch[3];
            const visibilitySymbol = visibility === 'public' ? '+' : (visibility === 'private' ? '-' : '#');

            element.properties.attributes.push(`${visibilitySymbol} ${name}: ${type}`);
          }

          // 查找方法
          let methodMatch;
          while ((methodMatch = methodRegex.exec(classBody)) !== null) {
            const visibility = methodMatch[1].toLowerCase();
            const returnType = methodMatch[2];
            const name = methodMatch[3];
            const visibilitySymbol = visibility === 'public' ? '+' : (visibility === 'private' ? '-' : '#');

            element.properties.methods.push(`${visibilitySymbol} ${name}: ${returnType}`);
          }
        }
      }
    });

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
      if ((element.type === UmlElementType.CLASS || element.type === UmlElementType.INTERFACE) && element.text) {
        // Start class definition
        if (element.type === UmlElementType.INTERFACE) {
          mermaidCode += `  class ${element.text} {\n    <<interface>>\n`;
        } else {
          mermaidCode += `  class ${element.text} {\n`;
        }

        // Add attributes
        if (element.properties && element.properties.attributes && element.properties.attributes.length > 0) {
          element.properties.attributes.forEach((attr: string) => {
            mermaidCode += `    ${attr}\n`;
          });
        }

        // Add methods
        if (element.properties && element.properties.methods && element.properties.methods.length > 0) {
          element.properties.methods.forEach((method: string) => {
            mermaidCode += `    ${method}()\n`;
          });
        }

        // Close class definition
        mermaidCode += `  }\n`;
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

    // 首先收集所有关系信息，以便在生成类时使用
    const inheritanceMap = new Map();
    const implementationMap = new Map();

    diagram.elements.forEach(element => {
      if ('source' in element && 'target' in element) {
        const arrow = element as UmlArrow;
        const source = diagram.elements.find(e => e.id === arrow.source);
        const target = diagram.elements.find(e => e.id === arrow.target);

        if (source?.text && target?.text) {
          if (arrow.type === UmlElementType.INHERITANCE_ARROW) {
            inheritanceMap.set(source.text, target.text);
          } else if (arrow.type === UmlElementType.IMPLEMENTATION_ARROW) {
            if (!implementationMap.has(source.text)) {
              implementationMap.set(source.text, []);
            }
            implementationMap.get(source.text).push(target.text);
          }
        }
      }
    });

    // Process classes and interfaces
    diagram.elements.forEach(element => {
      if (element.type === UmlElementType.CLASS && element.text) {
        let classDeclaration = `public class ${element.text}`;

        // 添加继承关系
        if (inheritanceMap.has(element.text)) {
          classDeclaration += ` : ${inheritanceMap.get(element.text)}`;
        }

        // 添加实现接口
        if (implementationMap.has(element.text)) {
          const interfaces = implementationMap.get(element.text);
          if (inheritanceMap.has(element.text)) {
            // 如果已经有继承，则用逗号分隔
            classDeclaration += `, ${interfaces.join(', ')}`;
          } else {
            // 如果没有继承，使用冒号
            classDeclaration += ` : ${interfaces.join(', ')}`;
          }
        }

        csharpCode += `${classDeclaration}\n{\n`;

        // Add attributes as properties
        if (element.properties && element.properties.attributes && element.properties.attributes.length > 0) {
          element.properties.attributes.forEach((attr: string) => {
            // Simple conversion - in a real implementation, we would parse the attribute syntax
            csharpCode += `    public string ${attr} { get; set; }\n`;
          });
          csharpCode += '\n';
        }

        // Add methods
        if (element.properties && element.properties.methods && element.properties.methods.length > 0) {
          element.properties.methods.forEach((method: string) => {
            // Simple conversion - in a real implementation, we would parse the method syntax
            csharpCode += `    public void ${method}()\n    {\n        // Method implementation\n    }\n`;
          });
        }

        csharpCode += `}\n\n`;
      } else if (element.type === UmlElementType.INTERFACE && element.text) {
        csharpCode += `public interface ${element.text}\n{\n`;

        // Add methods for interface
        if (element.properties && element.properties.methods && element.properties.methods.length > 0) {
          element.properties.methods.forEach((method: string)=> {
            // Interfaces have method signatures without implementation
            csharpCode += `    void ${method}();\n`;
          });
        }

        csharpCode += `}\n\n`;
      }
    });

    // 由于已经在前面处理了继承和实现关系，这里主要处理依赖和关联关系
    diagram.elements.forEach(element => {
      if ('source' in element && 'target' in element) {
        const arrow = element as UmlArrow;
        const source = diagram.elements.find(e => e.id === arrow.source);
        const target = diagram.elements.find(e => e.id === arrow.target);

        if (source?.text && target?.text) {
          switch (arrow.type) {
            case UmlElementType.DEPENDENCY_ARROW:
              // 添加依赖注释
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

    // 解析更复杂的继承和实现关系
    // 处理类继承类 - class Child : Parent
    const classInheritanceRegex = /class\s+(\w+)\s*:\s*(\w+)(?![<,])/g;
    while ((match = classInheritanceRegex.exec(code)) !== null) {
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

    // 处理类实现接口 - class Child : IParent 或 class Child : BaseClass, IParent
    const implementationRegex = /class\s+(\w+)\s*:(?:[^{]+,)?\s*(I\w+)/g;
    while ((match = implementationRegex.exec(code)) !== null) {
      const childClass = match[1];
      const interfaceName = match[2];

      const childElement = newDiagram.elements.find(e => e.text === childClass);
      const interfaceElement = newDiagram.elements.find(e => e.text === interfaceName);

      if (childElement && interfaceElement) {
        newDiagram.elements.push({
          id: uuidv4(),
          type: UmlElementType.IMPLEMENTATION_ARROW,
          position: { x: 0, y: 0 },
          source: childElement.id,
          target: interfaceElement.id
        } as UmlArrow);
      }
    }

    return this.repository.save(newDiagram);
  }
}
