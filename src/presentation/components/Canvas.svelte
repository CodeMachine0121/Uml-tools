<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import type {UmlDiagram} from '@/domain/entities/UmlDiagram.ts';
  import {
    type Position,
    type UmlArrow,
    type UmlElement,
    UmlElementType,
    type UmlNode,
    type UmlText
  } from '@/domain/entities/UmlElement.ts';
  import TextInputDialog from './TextInputDialog.svelte';

  export let diagram: UmlDiagram | undefined = undefined;
  export let selectedTool: UmlElementType | null = null;

  let canvas: HTMLDivElement;
  let isDrawing = false;
  let startPosition: Position | null = null;
  let selectedElement: UmlElement | null = null;
  let dragOffset = { x: 0, y: 0 };
  let connectionSource: UmlElement | null = null;

  const dispatch = createEventDispatcher<{
    elementAdd: { type: UmlElementType, position: Position, size?: { width: number, height: number } };
    textAdd: { position: Position, text: string };
    elementConnect: { sourceId: string, targetId: string, type: UmlElementType };
    elementUpdate: { elementId: string, updates: Partial<UmlElement> };
    elementRemove: { elementId: string };
  }>();

  // Track connection point information
  let connectionSourcePoint: string | null = null;
  let isResizing = false;

  // 文本输入对话框状态
  let showTextInput = false;
  let textInputPosition: Position = { x: 0, y: 0 };
  let textInputInitialValue = '';
  let textInputCallback: ((text: string) => void) | null = null;

  // 框选相关状态
  let isSelecting = false;
  let selectionBox = { x: 0, y: 0, width: 0, height: 0 };
  let selectedElements: UmlElement[] = [];

  function handleMouseDown(event: MouseEvent) {
    if (!diagram) return;

    const rect = canvas.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    // Check if clicking on a connection point
    if (event.target instanceof HTMLElement && event.target.classList.contains('connection-point')) {
      const parentElement = event.target.closest('.uml-node');
      if (parentElement) {
        const elementId = findElementIdByDomElement(parentElement);
        if (elementId) {
          const element = diagram.elements.find(e => e.id === elementId);
          if (element) {
            connectionSource = element;
            connectionSourcePoint = event.target.getAttribute('data-position');
            return;
          }
        }
      }
    }

    // Check if clicking on a resize handle
    if (event.target instanceof HTMLElement && event.target.classList.contains('resize-handle')) {
      const parentElement = event.target.closest('.uml-node');
      if (parentElement) {
        const elementId = findElementIdByDomElement(parentElement);
        if (elementId) {
          const element = diagram.elements.find(e => e.id === elementId);
          if (element) {
            selectedElement = element;
            isResizing = true;
            startPosition = position;
            return;
          }
        }
      }
    }

    // Check if clicking on an existing element
    const element = findElementAtPosition(position);

    if (element) {
      // Select element for dragging or connecting
      selectedElement = element;
      dragOffset = {
        x: position.x - element.position.x,
        y: position.y - element.position.y
      };

      // If an arrow tool is selected, start connection
      if (selectedTool && isArrowType(selectedTool)) {
        connectionSource = element;
      }
      // 如果选择了 Cursor 工具，设置为可拖动
      else if (selectedTool === UmlElementType.Cursor || selectedTool === null) {
        // 检查是否按住了Shift键进行多选
        if (event.shiftKey) {
          // 添加到已选中元素组，或从中移除
          const elementIndex = selectedElements.findIndex(e => e.id === element.id);
          if (elementIndex >= 0) {
            // 如果已经选中了，则从选中列表中移除
            selectedElements = selectedElements.filter(e => e.id !== element.id);
          } else {
            // 否则添加到选中列表
            selectedElements = [...selectedElements, element];
          }
        } else if (!selectedElements.some(e => e.id === element.id)) {
          // 如果没有按Shift并且当前元素不在选中列表中，则清空选中列表并仅选中当前元素
          selectedElements = [];
          // 只需选中元素，拖动将在 mousemove 中处理
        }
      }
    } else if (selectedTool && selectedTool !== UmlElementType.Cursor) {
      // Start drawing a new element
      isDrawing = true;
      startPosition = position;

      // If it's a text element, show text input dialog
      if (selectedTool === UmlElementType.TEXT) {
        isDrawing = false;
        showTextInput = true;
        textInputPosition = position;
        textInputInitialValue = '';
        textInputCallback = (text) => {
          dispatch('textAdd', { position, text });
        };
      }
    } else {
      // 点击空白区域，如果是选择工具，则开始框选
      if (selectedTool === UmlElementType.Cursor || selectedTool === null) {
        // 开始框选
        isSelecting = true;
        startPosition = position;
        selectionBox = { x: position.x, y: position.y, width: 0, height: 0 };

        // 如果没有按住Shift键，则清空之前的选择
        if (!event.shiftKey) {
          selectedElements = [];
        }
      }

      // 取消单个元素选择
      selectedElement = null;
    }
  }

  // Helper function to find element ID from DOM element
  function findElementIdByDomElement(domElement: Element): string | null {
    if (!diagram) return null;

    // 首先尝试从数据属性获取ID
    const elementId = domElement.getAttribute('data-element-id');
    if (elementId) {
      return elementId;
    }

    // 如果没有数据属性，回退到老方法
    // 获取所有节点元素
    const nodeElements = diagram.elements.filter(isNodeElement);

    // 查找DOM元素的数据属性或内容来匹配
    for (const node of nodeElements) {
      // 获取所有可能匹配的节点
      const possibleMatches = Array.from(document.querySelectorAll('.uml-node'));

      // 在所有可能的匹配中找到正确的元素
      for (const match of possibleMatches) {
        if (match === domElement) {
          // 尝试通过元素内容匹配 - 查找节点名称
          const nameElement = match.querySelector('.node-name');
          if (nameElement && nameElement.textContent === (node.text || 'Unnamed')) {
            return node.id;
          }

          // 如果不能通过内容匹配，尝试通过位置匹配
          const style = match.getAttribute('style');
          if (style) {
            const leftMatch = style.match(/left:\s*(\d+)px/);
            const topMatch = style.match(/top:\s*(\d+)px/);

            if (leftMatch && topMatch) {
              const left = parseInt(leftMatch[1]);
              const top = parseInt(topMatch[1]);

              if (Math.abs(left - node.position.x) < 5 && Math.abs(top - node.position.y) < 5) {
                return node.id;
              }
            }
          }
        }
      }
    }

    return null;
  }

  let tempArrowPath: string | null = null;
  let tempArrowType: UmlElementType | null = null;

      let isDragging = false;

      function handleMouseMove(event: MouseEvent) {
    if (!diagram) return;

    const rect = canvas.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    // Resizing an element
    if (isResizing && selectedElement && startPosition && isNodeElement(selectedElement)) {
      const newWidth = Math.max(50, selectedElement.position.x + selectedElement.size.width + (position.x - startPosition.x) - selectedElement.position.x);
      const newHeight = Math.max(50, selectedElement.position.y + selectedElement.size.height + (position.y - startPosition.y) - selectedElement.position.y);

      dispatch('elementUpdate', {
        elementId: selectedElement.id,
        updates: {
          size: {
            width: newWidth,
            height: newHeight
          }
        }
      });

      startPosition = position;
      return;
    }

    // 处理框选操作
    if (isSelecting && startPosition && (selectedTool === UmlElementType.Cursor || selectedTool === null)) {
      // 更新选择框的尺寸
      selectionBox = {
        x: Math.min(startPosition.x, position.x),
        y: Math.min(startPosition.y, position.y),
        width: Math.abs(position.x - startPosition.x),
        height: Math.abs(position.y - startPosition.y)
      };
      return;
    }

    // 只有在鼠标按下并且有选中元素时才能拖拽
    // 如果鼠标移动超过阈值距离，开始拖拽
    if (selectedElement && !connectionSource && !isResizing && 
        (selectedTool === UmlElementType.Cursor || selectedTool === null)) {

      // 确保有按下鼠标按钮（对应 event.buttons === 1）
      if (event.buttons === 1) {
        isDragging = true;

        // 确保元素不会被拖出画布
        const newX = Math.max(0, position.x - dragOffset.x);
        const newY = Math.max(0, position.y - dragOffset.y);

        // 如果是在已选中元素组中的元素，则移动所有选中的元素
        if (selectedElements.some(e => e.id === selectedElement.id)) {
          // 计算移动的偏移量
          const deltaX = newX - selectedElement.position.x;
          const deltaY = newY - selectedElement.position.y;

          // 移动所有选中的元素
          selectedElements.forEach(element => {
            if (element.id !== selectedElement.id) { // 跳过正在拖动的元素，因为它稍后会单独处理
              dispatch('elementUpdate', {
                elementId: element.id,
                updates: {
                  position: {
                    x: Math.max(0, element.position.x + deltaX),
                    y: Math.max(0, element.position.y + deltaY)
                  }
                }
              });
            }
          });
        }

        // 移动当前拖动的元素
        dispatch('elementUpdate', {
          elementId: selectedElement.id,
          updates: {
            position: {
              x: newX,
              y: newY
            }
          }
        });
      }
    }

    // Drawing a new element
    if (isDrawing && startPosition && selectedTool && !isArrowType(selectedTool)) {
      // We're just showing a preview here, actual element will be added on mouseup
    }

    // Drawing connection arrow
    if (connectionSource && selectedTool && isArrowType(selectedTool)) {
      // Calculate source point
      let sourceX, sourceY;

      if (isNodeElement(connectionSource)) {
        if (connectionSourcePoint) {
          // Use the selected connection point
          const sourceRect = connectionSource.position;
          const sourceSize = connectionSource.size;

          switch (connectionSourcePoint) {
            case 'top':
              sourceX = sourceRect.x + sourceSize.width / 2;
              sourceY = sourceRect.y;
              break;
            case 'right':
              sourceX = sourceRect.x + sourceSize.width;
              sourceY = sourceRect.y + sourceSize.height / 2;
              break;
            case 'bottom':
              sourceX = sourceRect.x + sourceSize.width / 2;
              sourceY = sourceRect.y + sourceSize.height;
              break;
            case 'left':
              sourceX = sourceRect.x;
              sourceY = sourceRect.y + sourceSize.height / 2;
              break;
            default:
              // Fallback to center
              sourceX = sourceRect.x + sourceSize.width / 2;
              sourceY = sourceRect.y + sourceSize.height / 2;
          }
        } else {
          // Calculate from center if no specific point selected
          const sourceCenter = {
            x: connectionSource.position.x + (connectionSource.size?.width || 0) / 2,
            y: connectionSource.position.y + (connectionSource.size?.height || 0) / 2
          };

          // Calculate the direction vector from source to mouse position
          const angle = Math.atan2(position.y - sourceCenter.y, position.x - sourceCenter.x);
          sourceX = sourceCenter.x + Math.cos(angle) * ((connectionSource.size?.width || 0) / 2);
          sourceY = sourceCenter.y + Math.sin(angle) * ((connectionSource.size?.height || 0) / 2);
        }
      } else {
        sourceX = connectionSource.position.x;
        sourceY = connectionSource.position.y;
      }

      // Create temporary path for visual feedback
      tempArrowPath = `M ${sourceX} ${sourceY} L ${position.x} ${position.y}`;
      tempArrowType = selectedTool;
    } else {
      tempArrowPath = null;
      tempArrowType = null;
    }
  }

  function handleMouseUp(event: MouseEvent) {
    if (!diagram) return;

    const rect = canvas.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    // 结束拖拽
    if (isDragging) {
      isDragging = false;
      // 保持元素选中状态
    }
    // Finish resizing
    else if (isResizing) {
      isResizing = false;
      startPosition = null;
      // Keep selectedElement selected
    }
    // 完成框选
    else if (isSelecting && startPosition) {
      isSelecting = false;

      // 如果选择框太小，可能是意外点击，不执行选择操作
      if (selectionBox.width > 5 && selectionBox.height > 5) {
        // 找出框选范围内的所有元素
        const elementsInBox = diagram.elements.filter(element => {
          // 对于节点元素
          if (isNodeElement(element)) {
            return (
              element.position.x < selectionBox.x + selectionBox.width &&
              element.position.x + element.size.width > selectionBox.x &&
              element.position.y < selectionBox.y + selectionBox.height &&
              element.position.y + element.size.height > selectionBox.y
            );
          }
          // 对于文本元素
          else if (isTextElement(element)) {
            const text = element.text || '';
            const textWidth = text.length * 8; // 估计每个字符8像素宽
            const textHeight = 20; // 估计高度

            return (
              element.position.x < selectionBox.x + selectionBox.width &&
              element.position.x + Math.max(textWidth, 50) > selectionBox.x &&
              element.position.y < selectionBox.y + selectionBox.height &&
              element.position.y + textHeight > selectionBox.y
            );
          }
          // 对于箭头暂不处理
          return false;
        });

        // 将框选的元素添加到已选中元素列表
        if (elementsInBox.length > 0) {
          // 如果按住了Shift键，则添加到现有选择中，否则替换现有选择
          if (event.shiftKey) {
            // 添加未选中的元素
            for (const element of elementsInBox) {
              if (!selectedElements.some(e => e.id === element.id)) {
                selectedElements = [...selectedElements, element];
              }
            }
          } else {
            selectedElements = elementsInBox;
          }
        }
      }

      // 重置选择框
      selectionBox = { x: 0, y: 0, width: 0, height: 0 };
      startPosition = null;
    }
    // Finish drawing a new element
    else if (isDrawing && startPosition && selectedTool && !isArrowType(selectedTool)) {
      const size = {
        width: Math.abs(position.x - startPosition.x),
        height: Math.abs(position.y - startPosition.y)
      };

      // Ensure minimum size
      if (size.width < 10) size.width = 100;
      if (size.height < 10) size.height = 50;

      dispatch('elementAdd', {
        type: selectedTool,
        position: {
          x: Math.min(position.x, startPosition.x),
          y: Math.min(position.y, startPosition.y)
        },
        size
      });

      isDrawing = false;
      startPosition = null;
    }

    // Finish connecting elements
    if (connectionSource && selectedTool && isArrowType(selectedTool)) {
      // Check if we're connecting to a connection point
      let targetConnectionPoint = null;
      let targetElement = null;

      if (event.target instanceof HTMLElement && event.target.classList.contains('connection-point')) {
        targetConnectionPoint = event.target.getAttribute('data-position');
        const parentElement = event.target.closest('.uml-node');
        if (parentElement) {
          const elementId = findElementIdByDomElement(parentElement);
          if (elementId) {
            targetElement = diagram.elements.find(e => e.id === elementId);
          }
        }
      } else {
        // Try to find any element at the position
        targetElement = findElementAtPosition(position);
      }

      if (targetElement && targetElement !== connectionSource) {
        dispatch('elementConnect', {
          sourceId: connectionSource.id,
          targetId: targetElement.id,
          type: selectedTool
        });
      }

      connectionSource = null;
      connectionSourcePoint = null;
      tempArrowPath = null;
      tempArrowType = null;
    }

    // Reset drawing state
    isDrawing = false;
    startPosition = null;

    // Don't reset selectedElement here to maintain selection
    // Only reset connection-related state
    if (!isResizing) {
      connectionSource = null;
      connectionSourcePoint = null;
      tempArrowPath = null;
      tempArrowType = null;
    }
  }

  function handleDoubleClick(event: MouseEvent) {
    if (!diagram) return;

    const rect = canvas.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    // Check if double-clicking on an existing element
    const element = findElementAtPosition(position);

    if (element) {
      // Edit text of existing element
      showTextInput = true;
      textInputPosition = {
        x: Math.max(0, position.x - 100), // 偏移以确保输入框居中
        y: position.y
      };
      textInputInitialValue = element.text || '';
      textInputCallback = (newText) => {
        dispatch('elementUpdate', {
          elementId: element.id,
          updates: { text: newText }
        });
      };
    } else {
      // Add new text element
      showTextInput = true;
      textInputPosition = position;
      textInputInitialValue = '';
      textInputCallback = (text) => {
        dispatch('textAdd', { position, text });
      };
    }
  }

  function handleSingleClick(event: MouseEvent) {
    if (!diagram) return;

    const rect = canvas.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    // 检查是否点击了已存在的元素
    const element = findElementAtPosition(position);

    // 如果选择了 Cursor 工具或者没有选择工具，允许选择和拖动元素
    if (selectedTool === UmlElementType.Cursor || selectedTool === null) {
      if (element) {
        // 选择元素并准备拖动
        selectedElement = element;
        dragOffset = {
          x: position.x - element.position.x,
          y: position.y - element.position.y
        };
      } else {
        // 点击空白区域，取消选择
        selectedElement = null;
      }
    }
  }

  function findElementAtPosition(position: Position): UmlElement | null {
    if (!diagram) return null;

    // Check in reverse order to select the top-most element
    for (let i = diagram.elements.length - 1; i >= 0; i--) {
      const element = diagram.elements[i];

      if (isNodeElement(element)) {
        if (
          position.x >= element.position.x &&
          position.x <= element.position.x + element.size.width &&
          position.y >= element.position.y &&
          position.y <= element.position.y + element.size.height
        ) {
          return element;
        }
      } else if (element.type === UmlElementType.TEXT) {
        // 改进的文本元素命中测试
        // 获取文本实际长度的估计值
        const text = element.text || '';
        const textWidth = text.length * 8; // 估计每个字符8像素宽
        const textHeight = 20; // 估计高度

        if (
          position.x >= element.position.x &&
          position.x <= element.position.x + Math.max(textWidth, 50) && // 确保至少有最小点击区域
          position.y >= element.position.y &&
          position.y <= element.position.y + textHeight
        ) {
          return element;
        }
      }
    }

    return null;
  }

  function isNodeElement(element: UmlElement): element is UmlNode {
    return element.type === UmlElementType.CLASS || element.type === UmlElementType.INTERFACE;
  }

  function isArrowType(type: UmlElementType): boolean {
    return [
      UmlElementType.DEPENDENCY_ARROW,
      UmlElementType.IMPLEMENTATION_ARROW,
      UmlElementType.INHERITANCE_ARROW,
      UmlElementType.ASSOCIATION_ARROW
    ].includes(type);
  }

  function isArrowElement(element: UmlElement): element is UmlArrow {
    return isArrowType(element.type);
  }

  function isTextElement(element: UmlElement): element is UmlText {
    return element.type === UmlElementType.TEXT;
  }

      $: canvasCursor = selectedTool === UmlElementType.Cursor
    ? 'default'
    : selectedTool
      ? isArrowType(selectedTool)
        ? connectionSource ? 'crosshair' : 'default'
        : 'crosshair'
      : 'default';

  function getArrowPath(arrow: UmlArrow): string {
    if (!diagram) return '';

    const source = diagram.elements.find(e => e.id === arrow.source);
    const target = diagram.elements.find(e => e.id === arrow.target);

    if (!source || !target) return '';

    // Calculate source and target points
    let sourceX, sourceY, targetX, targetY;

    if (isNodeElement(source)) {
      const sourceRect = source.position;
      const sourceSize = source.size;
      const sourceCenter = {
        x: sourceRect.x + sourceSize.width / 2,
        y: sourceRect.y + sourceSize.height / 2
      };

      // Calculate target center
      let targetCenter;
      if (isNodeElement(target)) {
        targetCenter = {
          x: target.position.x + target.size.width / 2,
          y: target.position.y + target.size.height / 2
        };
      } else {
        targetCenter = {
          x: target.position.x,
          y: target.position.y
        };
      }

      // Determine which connection point to use based on the angle
      const angle = Math.atan2(targetCenter.y - sourceCenter.y, targetCenter.x - sourceCenter.x);
      const angleInDegrees = angle * (180 / Math.PI);

      // Determine which side of the source node to use
      if (angleInDegrees >= -45 && angleInDegrees < 45) {
        // Right side
        sourceX = sourceRect.x + sourceSize.width;
        sourceY = sourceRect.y + sourceSize.height / 2;
      } else if (angleInDegrees >= 45 && angleInDegrees < 135) {
        // Bottom side
        sourceX = sourceRect.x + sourceSize.width / 2;
        sourceY = sourceRect.y + sourceSize.height;
      } else if ((angleInDegrees >= 135 && angleInDegrees <= 180) || (angleInDegrees >= -180 && angleInDegrees < -135)) {
        // Left side
        sourceX = sourceRect.x;
        sourceY = sourceRect.y + sourceSize.height / 2;
      } else {
        // Top side
        sourceX = sourceRect.x + sourceSize.width / 2;
        sourceY = sourceRect.y;
      }
    } else {
      sourceX = source.position.x;
      sourceY = source.position.y;
    }

    if (isNodeElement(target)) {
      const targetRect = target.position;
      const targetSize = target.size;
      const targetCenter = {
        x: targetRect.x + targetSize.width / 2,
        y: targetRect.y + targetSize.height / 2
      };

      // Calculate source center or use source point
      let sourcePoint = { x: sourceX, y: sourceY };

      // Determine which connection point to use based on the angle
      const angle = Math.atan2(sourcePoint.y - targetCenter.y, sourcePoint.x - targetCenter.x);
      const angleInDegrees = angle * (180 / Math.PI);

      // Determine which side of the target node to use
      if (angleInDegrees >= -45 && angleInDegrees < 45) {
        // Right side
        targetX = targetRect.x + targetSize.width;
        targetY = targetRect.y + targetSize.height / 2;
      } else if (angleInDegrees >= 45 && angleInDegrees < 135) {
        // Bottom side
        targetX = targetRect.x + targetSize.width / 2;
        targetY = targetRect.y + targetSize.height;
      } else if ((angleInDegrees >= 135 && angleInDegrees <= 180) || (angleInDegrees >= -180 && angleInDegrees < -135)) {
        // Left side
        targetX = targetRect.x;
        targetY = targetRect.y + targetSize.height / 2;
      } else {
        // Top side
        targetX = targetRect.x + targetSize.width / 2;
        targetY = targetRect.y;
      }
    } else {
      targetX = target.position.x;
      targetY = target.position.y;
    }

    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }

  function getArrowMarker(type: UmlElementType): string {
    switch (type) {
      case UmlElementType.INHERITANCE_ARROW:
        return 'url(#inheritance-marker)';
      case UmlElementType.IMPLEMENTATION_ARROW:
        return 'url(#implementation-marker)';
      case UmlElementType.DEPENDENCY_ARROW:
        return 'url(#dependency-marker)';
      case UmlElementType.ASSOCIATION_ARROW:
        return 'url(#association-marker)';
      default:
        return '';
    }
  }

  function getArrowStyle(type: UmlElementType): string {
    switch (type) {
      case UmlElementType.DEPENDENCY_ARROW:
      case UmlElementType.IMPLEMENTATION_ARROW:
        return 'stroke-dasharray: 4';
      default:
        return '';
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!diagram) return;

    // Delete key (Delete or Backspace)
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // 如果有选中的单个元素
      if (selectedElement) {
        dispatch('elementRemove', { elementId: selectedElement.id });
        selectedElement = null;
        event.preventDefault();
      }
      // 如果有选中的多个元素
      else if (selectedElements.length > 0) {
        // 批量删除所有选中的元素
        for (const element of selectedElements) {
          dispatch('elementRemove', { elementId: element.id });
        }
        selectedElements = [];
        event.preventDefault();
      }
    }

    // 按Escape键取消选择
    if (event.key === 'Escape') {
      selectedElement = null;
      selectedElements = [];
      event.preventDefault();
    }
  }
</script>

<div 
  class="canvas"
  bind:this={canvas}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:dblclick={handleDoubleClick}
  on:click={handleSingleClick}
  on:keydown={handleKeyDown}
  tabindex="0"
  style="cursor: {canvasCursor};"
>
  <svg width="100%" height="100%" class="arrow-layer">
    <!-- 选择框 -->
    {#if isSelecting && selectionBox.width > 0 && selectionBox.height > 0}
      <rect
        x={selectionBox.x}
        y={selectionBox.y}
        width={selectionBox.width}
        height={selectionBox.height}
        fill="rgba(65, 105, 225, 0.1)"
        stroke="royalblue"
        stroke-width="1"
        stroke-dasharray="5,5"
        pointer-events="none"
      />
    {/if}

    <!-- Arrow markers -->
    <defs>
      <marker
        id="inheritance-marker"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="white" stroke="black" stroke-width="1" />
      </marker>

      <marker
        id="implementation-marker"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="white" stroke="black" stroke-width="1" />
      </marker>

      <marker
        id="dependency-marker"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="black" stroke-width="1" />
      </marker>

      <marker
        id="association-marker"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
      >
        <path d="M 0 0 L 10 5" stroke="black" stroke-width="1" />
      </marker>
    </defs>

    <!-- Arrows -->
    {#if diagram}
      {#each diagram.elements.filter(isArrowElement) as arrow}
        <path
          d={getArrowPath(arrow)}
          stroke="black"
          stroke-width="1.5"
          fill="none"
          marker-end={getArrowMarker(arrow.type)}
          style={getArrowStyle(arrow.type)}
          class="arrow-path"
        />
      {/each}
    {/if}

    <!-- Temporary arrow being drawn -->
    {#if tempArrowPath && tempArrowType}
      <path
        d={tempArrowPath}
        stroke="black"
        stroke-width="1.5"
        fill="none"
        marker-end={getArrowMarker(tempArrowType)}
        style={getArrowStyle(tempArrowType)}
        class="temp-arrow-path"
      />
    {/if}
  </svg>

  <!-- UML Elements -->
  {#if diagram}
    {#each diagram.elements as element}
      {#if isNodeElement(element)}
        <div
          class="uml-node"
          class:uml-class={element.type === UmlElementType.CLASS}
          class:uml-interface={element.type === UmlElementType.INTERFACE}
          class:selected={selectedElement === element || selectedElements.some(sel => sel.id === element.id)}
          data-element-id={element.id}
          on:mousedown={(e) => {
            if (selectedTool === UmlElementType.Cursor || selectedTool === null) {
              selectedElement = element;
              const rect = canvas.getBoundingClientRect();
              const position = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              };
              dragOffset = {
                x: position.x - element.position.x,
                y: position.y - element.position.y
              };
              e.stopPropagation();
            }
          }}
          style="
            left: {element.position.x}px;
            top: {element.position.y}px;
            width: {element.size.width}px;
            height: {element.size.height}px;
          "
        >
          <div class="node-header">
            {#if element.type === UmlElementType.INTERFACE}
              <span class="stereotype">&lt;&lt;interface&gt;&gt;</span>
            {/if}
            <div class="node-name">{element.text || 'Unnamed'}</div>
          </div>
          <div class="node-attributes">
            <!-- Attributes would go here -->
          </div>
          <div class="node-methods">
            <!-- Methods would go here -->
          </div>

          <!-- Connection points -->
          <div class="connection-point top" data-position="top"></div>
          <div class="connection-point right" data-position="right"></div>
          <div class="connection-point bottom" data-position="bottom"></div>
          <div class="connection-point left" data-position="left"></div>

          <!-- Resize handle -->
          <div class="resize-handle"></div>
        </div>
      {:else if isTextElement(element)}
        <div
          class="uml-text"
          class:selected={selectedElement === element || selectedElements.some(sel => sel.id === element.id)}
          data-element-id={element.id}
          on:mousedown={(e) => {
            if (selectedTool === UmlElementType.Cursor || selectedTool === null) {
              selectedElement = element;
              const rect = canvas.getBoundingClientRect();
              const position = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              };
              dragOffset = {
                x: position.x - element.position.x,
                y: position.y - element.position.y
              };
              e.stopPropagation();
            }
          }}
          style="
            left: {element.position.x}px;
            top: {element.position.y}px;
          "
        >
          {element.text}
        </div>
      {/if}
    {/each}
  {/if}
</div>

{#if showTextInput}
  <TextInputDialog
    position={textInputPosition}
    initialText={textInputInitialValue}
    on:submit={({ detail }) => {
      if (textInputCallback) textInputCallback(detail.text);
      showTextInput = false;
      textInputCallback = null;
    }}
    on:cancel={() => {
      showTextInput = false;
      textInputCallback = null;
    }}
  />
{/if}

<style>
  .canvas {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: white;
    background-image: 
      linear-gradient(rgba(200, 200, 200, 0.2) 1px, transparent 1px),
      linear-gradient(90deg, rgba(200, 200, 200, 0.2) 1px, transparent 1px);
    background-size: 20px 20px;
  }

  svg {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .temp-arrow-path {
    pointer-events: none;
    stroke-opacity: 0.7;
  }

  .uml-node {
    position: absolute;
    background-color: white;
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    cursor: move; /* 添加移动光标提示 */
    user-select: none; /* 防止文本选择 */
    transition: box-shadow 0.2s ease;
  }

  .uml-node:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .uml-class {
    background-color: #e3f2fd;
  }

  .uml-interface {
    background-color: #f3e5f5;
  }

  .node-header {
    padding: 8px;
    border-bottom: 1px solid #ddd;
    text-align: center;
    font-weight: bold;
  }

  .stereotype {
    display: block;
    font-size: 0.8em;
    font-style: italic;
    color: #666;
  }

  .node-attributes, .node-methods {
    padding: 8px;
    border-bottom: 1px solid #ddd;
    min-height: 20px;
  }

  .node-methods {
    border-bottom: none;
  }

  .uml-text {
    position: absolute;
    padding: 4px;
    background-color: transparent;
    font-family: sans-serif;
    cursor: move;
    user-select: none; /* 防止文本选择 */
    min-width: 20px;
    min-height: 20px;
  }

  .connection-point {
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: white;
    border: 1px solid #333;
    border-radius: 50%;
    cursor: crosshair;
    z-index: 10;
    display: none;
  }

  .uml-node:hover .connection-point,
  .uml-node.selected .connection-point {
    display: block;
  }

  .connection-point.top {
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
  }

  .connection-point.right {
    right: -5px;
    top: 50%;
    transform: translateY(-50%);
  }

  .connection-point.bottom {
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
  }

  .connection-point.left {
    left: -5px;
    top: 50%;
    transform: translateY(-50%);
  }

  .resize-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: white;
    border: 1px solid #333;
    right: -5px;
    bottom: -5px;
    cursor: nwse-resize;
    z-index: 10;
    display: none;
  }

  .uml-node:hover .resize-handle,
  .uml-node.selected .resize-handle {
    display: block;
  }

  .uml-node.selected {
    outline: 2px solid #2196F3;
  }

  .uml-text.selected {
    outline: 2px solid #2196F3;
    background-color: rgba(33, 150, 243, 0.1);
    border-radius: 2px;
  }
</style>
