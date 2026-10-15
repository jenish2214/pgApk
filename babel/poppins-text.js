/**
 * Gives every app Text and TextInput Poppins Regular unless a style sets another family,
 * and caps system font scaling at 1.3x so large phone text still fits rows and buttons.
 */
module.exports = function poppinsText(babel) {
  const {types: t} = babel;

  return {
    name: 'poppins-text',
    visitor: {
      JSXOpeningElement(path) {
        const name = path.node.name;
        if (!t.isJSXIdentifier(name) || (name.name !== 'Text' && name.name !== 'TextInput')) {
          return;
        }
        const hasCap = path.node.attributes.some(
          attr => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, {name: 'maxFontSizeMultiplier'}),
        );
        if (!hasCap) {
          path.node.attributes.unshift(
            t.jsxAttribute(
              t.jsxIdentifier('maxFontSizeMultiplier'),
              t.jsxExpressionContainer(t.numericLiteral(1.3)),
            ),
          );
        }
        const family = t.objectExpression([
          t.objectProperty(t.identifier('fontFamily'), t.stringLiteral('Poppins-Regular')),
        ]);
        const styleAttr = path.node.attributes.find(
          attr => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, {name: 'style'}),
        );
        if (!styleAttr) {
          path.node.attributes.push(t.jsxAttribute(t.jsxIdentifier('style'), t.jsxExpressionContainer(family)));
          return;
        }
        if (!t.isJSXExpressionContainer(styleAttr.value) || !styleAttr.value.expression) {
          return;
        }
        styleAttr.value = t.jsxExpressionContainer(
          t.arrayExpression([family, styleAttr.value.expression]),
        );
      },
    },
  };
};
