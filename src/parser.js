// \s : matches any whitespace character (equal to [\r\n\t\f\v ])
//  + : match previous condition for one and unlimited times
export function lexer(code) {
    var _tokens = code
        .replace(/[\n\r]/g, ' *nl* ')
        .replace(/\[/g, ' *ob* ')
        .replace(/\]/g, ' *cb* ')
        .replace(/\{/g, ' *ocb* ')
        .replace(/\}/g, ' *ccb* ')
        .split(/[\t\f\v ]+/)
    var tokens = []
    for (var i = 0; i < _tokens.length; i++) {
        var t = _tokens[i]
        if (t.length <= 0 || isNaN(t)) {
            if (t === '*nl*') {
                tokens.push({type: 'newline'})
            } else if (t === '*ob*') {
                tokens.push({type: 'ob'})
            } else if (t === '*cb*') {
                tokens.push({type: 'cb'})
            } else if (t === '*ocb*') {
                tokens.push({type: 'ocb'})
            } else if (t === '*ccb*') {
                tokens.push({type: 'ccb'})
            } else if (t.length > 0) {
                tokens.push({type: 'word', value: t})
            }
        } else {
            tokens.push({type: 'number', value: t})
        }
    }

    if (tokens.length < 1) {
        throw 'No Tokens Found. Try "Paper 10"'
    }

    return tokens
}

export function parser(tokens) {
    function expectedTypeCheck(type, expect) {
        if (Array.isArray(expect)) {
            var i = expect.indexOf(type)
            return i >= 0
        }
        return type === expect
    }

    function createDot(current_token, currentPosition, node) {
        var expectedType = ['ob', 'number', 'number', 'cb']
        var expectedLength = 4
        currentPosition = currentPosition || 0
        node = node || {type: 'dot'}

        if (currentPosition < expectedLength - 1) {
            if (expectedTypeCheck(current_token.type, expectedType[currentPosition])) {
                if (currentPosition === 1) {
                    node.x = current_token.value
                }
                if (currentPosition === 2) {
                    node.y = current_token.value
                }
                currentPosition++
                createDot(tokens.shift(), currentPosition, node)
            } else {
                throw 'Expected ' + expectedType[currentPosition] + ' but found ' + current_token.type + '.'
            }
        }
        return node
    }

    function findArguments(command, expectedLength, expectedType, currentPosition, currentList) {
        currentPosition = currentPosition || 0
        currentList = currentList || []
        while (expectedLength > currentPosition) {
            var token = tokens.shift()
            if (!token) {
                throw command + ' takes ' + expectedLength + ' argument(s). '
            }

            if (expectedType) {
                var expected = expectedTypeCheck(token.type, expectedType[currentPosition])
                if (!expected) {
                    throw command + ' takes ' + JSON.stringify(expectedType[currentPosition]) + ' as argument ' + (currentPosition + 1) + '. ' + (token ? 'Instead found a ' + token.type + ' ' + (token.value || '') + '.' : '')
                }
                if (token.type === 'number' && (token.value < 0 || token.value > 16777215)) {
                    throw 'Found value ' + token.value + ' for ' + command + '. Value must be between 0 - 16777215.'
                }
            }

            var arg = {
                type: token.type,
                value: token.value
            }
            if (token.type === 'ob') {
                arg = createDot(token)
            }
            currentList.push(arg)
            currentPosition++
        }
        return currentList
    }

    var AST = {
        type: 'Drawing',
        body: []
    }
    var paper = false
    var pen = false

    while (tokens.length > 0) {
        var current_token = tokens.shift()
        if (current_token.type === 'word') {
            if (current_token.value == '//') {
                var expression = {
                    type: 'CommentExpression',
                    value: ''
                }
                var next = tokens.shift()
                while (next.type !== 'newline') {
                    expression.value += next.value + ' '
                    next = tokens.shift()
                }
                AST.body.push(expression)
            } else if (current_token.value == 'Paper') {

                if (paper) {
                    throw 'You can not define Paper more than once'
                }
                var expression = {
                    type: 'CallExpression',
                    name: 'Paper',
                    arguments: []
                }
                var args = findArguments('Paper', 1)
                expression.arguments = expression.arguments.concat(args)
                AST.body.push(expression)
                paper = true
            } else if (current_token.value == 'Pen') {
                var expression = {
                    type: 'CallExpression',
                    name: 'Pen',
                    arguments: []
                }
                var args = findArguments('Pen', 1)
                expression.arguments = expression.arguments.concat(args)
                AST.body.push(expression)
                pen = true
            } else if (current_token.value == 'Line') {
                if (!paper) {
                    throw 'You should make paper before invoking Line'
                }
                if (!pen) {
                    throw 'Please define Pen before invoking Line'
                }
                var expression = {
                    type: 'CallExpression',
                    name: 'Line',
                    arguments: []
                }
                var args = findArguments('Line', 4)
                expression.arguments = expression.arguments.concat(args)
                AST.body.push(expression)
            } else if (current_token.value == 'Circle') {
                if (!paper) {
                    throw 'You should make paper before invoking Circle'
                }
                if (!pen) {
                    throw 'Please define Pen before invoking Circle'
                }
                var expression = {
                    type: 'CallExpression',
                    name: 'Circle',
                    arguments: []
                }
                var args = findArguments('Circle', 3)
                expression.arguments = expression.arguments.concat(args)
                AST.body.push(expression)
            } else if (current_token.value == 'Rect') {
                if (!paper) {
                    throw 'You should make paper before invoking Rect'
                }
                if (!pen) {
                    throw 'Please define Pen before invoking Rect'
                }
                var expression = {
                    type: 'CallExpression',
                    name: 'Rect',
                    arguments: []
                }
                var args = findArguments('Rect', 4)
                expression.arguments = expression.arguments.concat(args)
                AST.body.push(expression)
            } else if (current_token.value == 'Set') {
                var args = findArguments('Set', 2, [['word', 'ob'], ['number', 'word']])
                var obj = {}
                if (args[0].type === 'dot') {
                    AST.body.push({
                        type: 'CallExpression',
                        name: 'Pen',
                        arguments: [args[1]]
                    })
                    obj.type = 'CallExpression',
                        obj.name = 'Line',
                        obj.arguments = [
                            {type: 'number', value: args[0].x},
                            {type: 'number', value: args[0].y},
                            {type: 'number', value: args[0].x},
                            {type: 'number', value: args[0].y}
                        ]
                } else {
                    obj.type = 'VariableDeclaration'
                    obj.name = 'Set'
                    obj.identifier = args[0]
                    obj.value = args[1]
                }

                AST.body.push(obj)
            } else if (current_token.value == 'SetMod') {
                var args = findArguments('SetMode', 4, ['word', ['word', 'number'], 'word', ['word', 'number']])
                var obj = {}
                obj.type = 'VariableDeclaration'
                obj.name = 'Set'
                obj.identifier = args[0]
                let opperand1 = args[1];
                let opperand2 = args[3];

                if (opperand1.type == "word") {
                    let object = AST.body.find(object => object.type == 'VariableDeclaration' && object.identifier.value == opperand1.value);
                    if (!object){
                        throw "Variable " + opperand1.value + " is not defined"
                    }
                    opperand1.value = Number(object.value.value);
                }

                if (opperand2.type == "word") {
                    let object = AST.body.find(object => object.type == 'VariableDeclaration' && object.identifier.value == opperand2.value);
                    if (!object){
                        throw "Variable " + opperand2.value + " is not defined"
                    }
                    opperand2.value = Number(object.value.value);
                }

                let finalVal = 0;
                switch (args[2].value) {
                    case "sub":
                    case "-":
                        finalVal = Number(opperand1.value) - Number(opperand2.value);
                        break;
                    case "add":
                    case "+":
                        finalVal = Number(opperand1.value) + Number(opperand2.value);
                        break;
                    case "mult":
                    case "*":
                        finalVal = Number(opperand1.value) * Number(opperand2.value);
                        break;
                    case "div":
                    case "/":
                        finalVal = Number(opperand1.value) / Number(opperand2.value);
                        break;
                }


                console.log(obj)
                obj.value = {type: 'number', value: finalVal}

                AST.body.push(obj)
            }

        } else {
            switch (current_token.type) {
                case 'ocb' :
                    console.log("Block Open")
                    var block = {
                        type: 'Block Start'
                    }
                    AST.body.push(block)
                    break
                case 'newline':
                    break;
                case 'ccb' :
                    var block = {
                        type: 'Block End'
                    }
                    AST.body.push(block)
                    break
                default:
                    throw "Unexpected Token Type: " + current_token.type
            }
        }
    }

    return AST
}