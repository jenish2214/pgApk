/**
 * Gives every app Text and TextInput Poppins Regular unless a style sets another family.
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
