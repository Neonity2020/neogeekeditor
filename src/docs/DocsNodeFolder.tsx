import React, { Component, DragEvent } from "react"
import { EDocsNodeType, IDocsNodeBase, EDocsNodeChangeType, EDocsProviderType } from "../types/docs.d"
import { LoadingOutlined, FolderOpenOutlined, FolderOutlined, FolderAddOutlined, ReloadOutlined, DownOutlined, RightOutlined } from '@ant-design/icons'
import BarItem from '../widgets/BarItem'
import { Dropdown, Empty, Menu, Popconfirm, Button } from 'antd';
import TransitionModal from '../widgets/TransitionModal'
import './DocsNode.less'
import DocsNodeEdit from '../widgets/TextEdit'
import { bindEvent, unbindEvent } from '../utils/utils'
import { message } from 'antd'

export default class DocsNodeFolder extends Component<{
    node: IDocsNodeBase;
    activeNode: IDocsNodeBase | undefined;
    onActiveNode: (node: IDocsNodeBase) => void;
    hideOps?: boolean;
    noHeader?: boolean;
}, {
    expand: boolean;
    addNodeEditing: boolean;
    titleEditing: boolean;
    nodeId: string;
}> {

    private addNodeType!: EDocsNodeType
    private transitionModal!: TransitionModal | null;
    private readonly MIME_TYPE = 'application/geekeditor-doc';
    static dropNodeMap: { [key: string]: IDocsNodeBase } = {}
    constructor(props: any) {
        super(props);
        this.state = {
            expand: !!props.noHeader,
            addNodeEditing: false,
            titleEditing: false,
            nodeId: ''
        }
        this.addNodeType = EDocsNodeType.EDocsNodeTypeDoc;
    }

    onExpand = (expand?: boolean) => {

        const { node } = this.props;

        expand = expand === undefined ? !this.state.expand : expand;

        if (expand && node.nodeType === EDocsNodeType.EDocsNodeTypeDir && !node.isLoaded) {
            this.onReload()
        }

        this.setState({
            expand: expand
        })

    }

    onActive = (e: React.MouseEvent) => {
        const { onActiveNode, node } = this.props;
        onActiveNode(node);
        if (!this.state.expand && e.button === 0) {
            this.onExpand()
        }
        e.stopPropagation();
    }


    onCreateNode = (nodeType: EDocsNodeType) => {
        this.setState({
            addNodeEditing: true,
            expand: true
        })
        this.addNodeType = nodeType

    }

    onReload = () => {
        const { node } = this.props;
        node.load().then((success) => {
        })
    }

    onAddNoteEditing = (text: string) => {
        if (text.length) {
            const { node } = this.props;
            const nodeType = this.addNodeType || EDocsNodeType.EDocsNodeTypeDir;
            const children = node.children;
            const index = children.findIndex((n) => n.title === text && n.nodeType === nodeType);
            if (index !== -1) {
                message.warn(`不能创建重名${nodeType === EDocsNodeType.EDocsNodeTypeDoc ? '文档' : '文件夹'}`)
                return;
            }

            node.createNode({
                nodeType: nodeType,
                parentNode: node,
                data: {
                    title: text,
                    content: JSON.stringify({content: ""})
                }
            }).then((node) => {
                if (node) {
                    node.mount().then((success) => {
                        if (success) {
                            const { onActiveNode } = this.props;
                            onActiveNode(node);
                        } else {
                            message.error('创建保存失败');
                        }
                    })
                } else {
                    message.error('创建保存失败');
                }
                this.setState({
                    addNodeEditing: false
                })
                return node;
            })
        } else {
            this.setState({
                addNodeEditing: false
            })
        }
    }


    onTitleEditing = (text: string) => {
        if (text.length) {
            const { node } = this.props;
            node.setTitle(text);
            this.setState({
                titleEditing: false
            })
        } else {
            this.setState({
                titleEditing: false
            })
        }
    }

    onNodeChanged = (type: EDocsNodeChangeType) => {
        if (type === EDocsNodeChangeType.EDocsNodeChangeTypeTitle ||
            type === EDocsNodeChangeType.EDocsNodeChangeTypeChildren ||
            type === EDocsNodeChangeType.EDocsNodeChangeTypeSaving ||
            type === EDocsNodeChangeType.EDocsNodeChangeTypeLoading ||
            type === EDocsNodeChangeType.EDocsNodeChangeTypeRemoving) {
            this.forceUpdate()
        }
    }

    componentDidMount() {
        const { node } = this.props;
        this.setState({
            nodeId: node.id + ''
        })
        node.onChanged(this.onNodeChanged);
        // node.on('expand', this.onExpand);
        // node.on('create', this.onCreateNode);
    }

    componentWillUnmount() {
        const { node } = this.props;
        node.offChanged(this.onNodeChanged);
        // node.off('expand', this.onExpand);
        // node.off('create', this.onCreateNode)
    }

    render() {
        const { node, activeNode, onActiveNode, noHeader } = this.props;
        const hideOps = this.props.hideOps;
        const { expand, addNodeEditing, titleEditing, nodeId } = this.state;
        const loading = node.isSaving || node.isLoading || node.isRemoving;
        const title = node.title;
        const children = node.children.filter((node) => node.nodeType === EDocsNodeType.EDocsNodeTypeDir);
        const supportFolder = node.supportCreateNode(EDocsNodeType.EDocsNodeTypeDir);
        const supportReload = node.supportReloadNode;
        const isFolder = node.nodeType === EDocsNodeType.EDocsNodeTypeDir;
        const isActive = node === activeNode;
        const Nodes = children.map((node) => {
            return <DocsNodeFolder hideOps={hideOps} key={node.tempID} node={node} activeNode={activeNode} onActiveNode={onActiveNode} />
        })

        return (
            <>
                <div data-node-id={nodeId} className={["docs-node", isFolder ? " docs-node--folder" : "", isActive ? " active" : ""].join("")} >
                    {!noHeader && <div>
                            {!titleEditing &&
                                <div className="docs-node__nav" onClick={this.onActive}>
                                    {!loading && isFolder && <span onClick={(e)=>{e.stopPropagation();this.onExpand()}} className="docs-node__expand">{expand ? <DownOutlined /> : <RightOutlined />}</span>}
                                    <div className="docs-node__info">
                                        {loading && <LoadingOutlined />}
                                        {isFolder && <FolderOutlined />}
                                        <span className="docs-node__name">{title}</span>
                                    </div>
                                    {!hideOps && !loading && <div className="docs-node__ops">
                                        {supportFolder && <BarItem wrapClassName="app-guide-newfolder" onClick={() => { this.onCreateNode(EDocsNodeType.EDocsNodeTypeDir) }} icon={<FolderAddOutlined />} />}
                                        {supportReload && <BarItem wrapClassName="app-guide-refresh" onClick={this.onReload} icon={<ReloadOutlined />} />}
                                        {/* {!isFolder && <BarItem onClick={this.onReload} icon={<EditOutlined />} />} */}
                                    </div>}
                                </div>}
                        </div>
                    }
                    {titleEditing && <div className="docs-node__title-editing"><DocsNodeEdit text={title} onFinishing={this.onTitleEditing} /></div>}
                    {isFolder &&
                        <div className={["docs-node__content", (addNodeEditing || Nodes.length) && !noHeader ? ' padding' : ''].join('')} style={{ display: expand ? `block` : `none` }}>
                            {addNodeEditing && <div className="docs-node__adding"><DocsNodeEdit text="" onFinishing={this.onAddNoteEditing} /></div>}
                            {Nodes}
                        </div>}
                </div>
            </>

        )
    }
}