import trimerge from './trimerge';

const initialDoc = {
    document: [
        {
            id: 1634618795110,
            children: [
                {
                    type: 'paragraph',
                    id: 1634702421168,
                    children: [
                        {
                            text: 'a'
                        }
                    ]
                }
            ]
        }
    ]
};

const docLeft = {
    document: [
        {
            id: 1634618795110,
            children: [
                {
                    type: 'paragraph',
                    id: 1634702421168,
                    children: [
                        {
                            text: '1'
                        }
                    ]
                },
                {
                    type: 'paragraph',
                    id: 1634702486109,
                    children: [
                        {
                            text: 'a'
                        }
                    ]
                }
            ]
        }
    ]
}
const docRight = {
    document: [
        {
            id: 1634618795110,
            children: [
                {
                    type: 'paragraph',
                    id: 1634702421168,
                    children: [
                        {
                            text: 'a'
                        }
                    ]
                },
                {
                    type: 'paragraph',
                    id: 1634702527500,
                    children: [
                        {
                            text: 'b'
                        }
                    ]
                }
            ]
        }
    ]
}
describe('test trimerge', () => {
    it('works on dual document inserts', () => {
        expect(trimerge(initialDoc, docLeft, docRight)).toEqual({
            document: [
                {
                    id: 1634618795110,
                    children: [
                        {
                            type: 'paragraph',
                            id: 1634702421168,
                            children: [
                                {
                                    text: '1'
                                }
                            ]
                        },
                        {
                            type: 'paragraph',
                            id: 1634702486109,
                            children: [
                                {
                                    text: 'a'
                                }
                            ]
                        },
                        {
                            type: 'paragraph',
                            id: 1634702527500,
                            children: [
                                {
                                    text: 'b'
                                }
                            ]
                        }
                    ]
                }
            ]
        })
    })
})

const merge = {
    "initial": {
        "foo": {
            "name": "foo",
            "document": [
                {
                    "id": "57dd587a-8899-4cdc-b567-95e0471efff5",
                    "children": [
                        {
                            "id": "7280361a-b34c-4d7c-b9af-7c83da905994",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "I'm starting a restaurant about my fictional cartoon daughter"
                                }
                            ]
                        },
                        {
                            "id": "2816a324-7c13-4baf-a88f-644014c4a645",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "mergeDocYoXkI"
                                }
                            ]
                        },
                        {
                            "id": "df1810f2-af5c-4924-958d-1c58813f96e2",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "okdasf"
                                }
                            ]
                        },
                        {
                            "id": "aa1b1524-9a9d-412a-82bd-4ed62823bb34",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "da"
                                }
                            ]
                        },
                        {
                            "id": "763ab538-4b1f-4ac5-b173-79f9a164003a",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "If they just repealed these ridiculous anti drunk driving laws"
                                }
                            ]
                        }
                    ]
                }
            ],
            "references": [],
            "backReferences": []
        }
    },
    "left": {
        "foo": {
            "name": "foo",
            "document": [
                {
                    "id": "57dd587a-8899-4cdc-b567-95e0471efff5",
                    "children": [
                        {
                            "id": "7280361a-b34c-4d7c-b9af-7c83da905994",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "I'm starting a restaurant about my fictional cartoon daughter"
                                }
                            ]
                        },
                        {
                            "id": "2816a324-7c13-4baf-a88f-644014c4a645",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "mergeDocYoXkI"
                                }
                            ]
                        },
                        {
                            "id": "df1810f2-af5c-4924-958d-1c58813f96e2",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "okdasf"
                                }
                            ]
                        },
                        {
                            "id": "aa1b1524-9a9d-412a-82bd-4ed62823bb34",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "da",
                                    "bold": true
                                }
                            ]
                        },
                        {
                            "id": "763ab538-4b1f-4ac5-b173-79f9a164003a",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "If they just repealed these ridiculous anti drunk driving laws"
                                }
                            ]
                        }
                    ]
                }
            ],
            "references": [],
            "backReferences": []
        }
    },
    "right": {
        "foo": {
            "name": "foo",
            "document": [
                {
                    "id": "57dd587a-8899-4cdc-b567-95e0471efff5",
                    "children": [
                        {
                            "id": "7280361a-b34c-4d7c-b9af-7c83da905994",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "I'm starting a restaurant about my fictional cartoon daughter"
                                }
                            ]
                        },
                        {
                            "id": "2816a324-7c13-4baf-a88f-644014c4a645",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "mergeDocYoXkIx"
                                }
                            ]
                        },
                        {
                            "id": "df1810f2-af5c-4924-958d-1c58813f96e2",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "okdasf"
                                }
                            ]
                        },
                        {
                            "id": "aa1b1524-9a9d-412a-82bd-4ed62823bb34",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": "da"
                                }
                            ]
                        },
                        {
                            "id": "c0de2d5d-bd50-4246-b86d-411e6ef419e1",
                            "type": "paragraph",
                            "children": [
                                {
                                    "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                    "text": ""
                                }
                            ]
                        }
                    ]
                }
            ],
            "references": [],
            "backReferences": []
        }
    }
}

describe('test x', () => {
    it('x', () => {
        expect(trimerge(merge.initial, merge.left, merge.right)).toEqual({
            "foo": {
                "name": "foo",
                "document": [
                    {
                        "id": "57dd587a-8899-4cdc-b567-95e0471efff5",
                        "children": [
                            {
                                "id": "7280361a-b34c-4d7c-b9af-7c83da905994",
                                "type": "paragraph",
                                "children": [
                                    {
                                        "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                        "text": "I'm starting a restaurant about my fictional cartoon daughter"
                                    }
                                ]
                            },
                            {
                                "id": "2816a324-7c13-4baf-a88f-644014c4a645",
                                "type": "paragraph",
                                "children": [
                                    {
                                        "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                        "text": "mergeDocYoXkIx"
                                    }
                                ]
                            },
                            {
                                "id": "df1810f2-af5c-4924-958d-1c58813f96e2",
                                "type": "paragraph",
                                "children": [
                                    {
                                        "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                        "text": "okdasf"
                                    }
                                ]
                            },
                            {
                                "id": "aa1b1524-9a9d-412a-82bd-4ed62823bb34",
                                "type": "paragraph",
                                "children": [
                                    {
                                        "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                        "text": "da"
                                    }
                                ]
                            },
                            {
                                "id": "763ab538-4b1f-4ac5-b173-79f9a164003a",
                                "type": "paragraph",
                                "children": [
                                    {
                                        "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                        "text": "If they just repealed these ridiculous anti drunk driving laws"
                                    }
                                ]
                            },
                            {
                                "id": "c0de2d5d-bd50-4246-b86d-411e6ef419e1",
                                "type": "paragraph",
                                "children": [
                                    {
                                        "id": "89b87359-f392-4587-a660-a2694e55de4d",
                                        "text": ""
                                    }
                                ]
                            }
                        ]
                    }
                ],
                "references": [],
                "backReferences": []
            }
        })
    })
})