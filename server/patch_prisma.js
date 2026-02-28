const fs = require('fs');
const path = require('path');

const indexPath = 'c:/Users/canc9/OneDrive/Desktop/Pro-66/server/node_modules/.prisma/client/index.js';
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Update RentalContractScalarFieldEnum
const enumStart = 'exports.Prisma.RentalContractScalarFieldEnum = {';
const enumEnd = '};';
const enumStartIndex = content.indexOf(enumStart);
if (enumStartIndex !== -1) {
    const enumEndIndex = content.indexOf(enumEnd, enumStartIndex);
    const oldEnum = content.substring(enumStartIndex, enumEndIndex + enumEnd.length);
    const newFields = [
        "idCard: 'idCard'",
        "phone: 'phone'",
        "address: 'address'",
        "receiptNumber: 'receiptNumber'",
        "receiptDate: 'receiptDate'",
        "greaseTrapFee: 'greaseTrapFee'",
        "lateRentFine: 'lateRentFine'",
        "lateUtilityFine: 'lateUtilityFine'",
        "menuType: 'menuType'"
    ];
    let newEnum = oldEnum.replace('};', '  ' + newFields.join(',\n  ') + '\n};');
    content = content.replace(oldEnum, newEnum);
    console.log('Updated ScalarFieldEnum');
}

// 2. Update runtimeDataModel (Giant JSON string)
const modelMarker = 'config.runtimeDataModel = JSON.parse("';
const modelStartIndex = content.indexOf(modelMarker);
if (modelStartIndex !== -1) {
    const stringStart = modelStartIndex + modelMarker.length;
    const stringEnd = content.indexOf('")', stringStart);
    let jsonString = content.substring(stringStart, stringEnd);
    
    // Unescape the JSON string (it's double escaped because it's inside a JS string)
    // Actually, it's just a string in quotes.
    const model = JSON.parse(jsonString.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    
    const rentalContract = model.models.RentalContract;
    if (rentalContract) {
        const newFields = [
            { name: 'idCard', kind: 'scalar', isList: false, isRequired: false, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'String', nativeType: null },
            { name: 'phone', kind: 'scalar', isList: false, isRequired: false, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'String', nativeType: null },
            { name: 'address', kind: 'scalar', isList: false, isRequired: false, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'String', nativeType: null },
            { name: 'receiptNumber', kind: 'scalar', isList: false, isRequired: false, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'String', nativeType: null },
            { name: 'receiptDate', kind: 'scalar', isList: false, isRequired: false, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'DateTime', nativeType: null },
            { name: 'greaseTrapFee', kind: 'scalar', isList: false, isRequired: true, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: true, type: 'Float', nativeType: null, default: 500 },
            { name: 'lateRentFine', kind: 'scalar', isList: false, isRequired: false, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'Float', nativeType: null },
            { name: 'lateUtilityFine', kind: 'scalar', isList: false, isRequired: false, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'Float', nativeType: null },
            { name: 'menuType', kind: 'scalar', isList: false, isRequired: false, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'String', nativeType: null }
        ];
        
        rentalContract.fields = rentalContract.fields.concat(newFields.map(f => ({ ...f, isGenerated: false, isUpdatedAt: false })));
        
        // Re-escape and update
        const updatedJson = JSON.stringify(model).replace(/"/g, '\\"');
        content = content.substring(0, stringStart) + updatedJson + content.substring(stringEnd);
        console.log('Updated runtimeDataModel');
    }
}

fs.writeFileSync(indexPath, content);
console.log('Successfully patched index.js');
