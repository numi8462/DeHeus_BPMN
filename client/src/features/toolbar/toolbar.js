import './toolbar.css'
import React, { useState } from 'react';
// ICONS
import AlignIcons from 'bpmn-js/lib/features/align-elements/AlignElementsIcons';
import DistributeIcons from 'bpmn-js/lib/features/distribute-elements/DistributeElementsIcons';
import Icons from '../../resources/toolbar/toolbar-icons';

function Toolbar({
  onSave,
  onImport,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDistributeHorizontally,
  onDistributeVertically,
  onExportXml,
  onExportSvg,
  onExportPdf,
  onExportPng,
  importFile,
  onFileChange,
  isOpen,
  setIsOpen,
  onContributor,
  onCheckIn,
  onShare,
  onPublish,
  onCancel,
  onDelete,
  mode,
  isRequested,
}) {

  // for fonts
  const fonts = ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana'];
  const onExportClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
  }
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {isOpen && mode !== "editing" &&
          <ul className='export-options'>
            <li>
              <a id='export-xml' title='download BPMN diagram' target='_blank'
                onClick={onExportXml}>XML
              </a>
            </li>
            <li>
              <a id='export-pdf' title='download BPMN diagram as pdf' target='_blank'
                onClick={onExportPdf}>PDF
              </a>
            </li>
            <li>
              <a id='export-png' title='download BPMN diagram as png' target='_blank'
                onClick={onExportPng}>PNG
              </a>
            </li>
            <li>
              <a id='export-svg' title='download BPMN diagram as svg' target='_blank'
                onClick={onExportSvg}>SVG
              </a>
            </li>
          </ul>
        }
        {isOpen && mode === 'editing' &&
          <ul className='export-options-editing'>
            <li>
              <a id='export-xml' title='download BPMN diagram' target='_blank'
                onClick={onExportXml}>XML
              </a>
            </li>
            <li>
              <a id='export-pdf' title='download BPMN diagram as pdf' target='_blank'
                onClick={onExportPdf}>PDF
              </a>
            </li>
            <li>
              <a id='export-png' title='download BPMN diagram as png' target='_blank'
                onClick={onExportPng}>PNG
              </a>
            </li>
            <li>
              <a id='export-svg' title='download BPMN diagram as svg' target='_blank'
                onClick={onExportSvg}>SVG
              </a>
            </li>
          </ul>
        }

        {mode === 'editing' && (
          <>
            <div className='toolbar-group-file'>
              <button onClick={onImport} dangerouslySetInnerHTML={{ __html: Icons.import }} title="import" />
              <input type='file' accept='text/xml' style={{ display: 'none' }} ref={importFile} onChange={(e) => onFileChange(e)} />
            </div>

            <div className='toolbar-spacing' dangerouslySetInnerHTML={{ __html: Icons.line }} />

            <div className="toolbar-group-action">
              <button onClick={onUndo} dangerouslySetInnerHTML={{ __html: Icons.undo }} title="undo" />
              <button onClick={onRedo} dangerouslySetInnerHTML={{ __html: Icons.redo }} title="redo" />
            </div>

            <div className='toolbar-spacing' dangerouslySetInnerHTML={{ __html: Icons.line }} />

            <div className="toolbar-group-zoom">
              <button onClick={onZoomOut} dangerouslySetInnerHTML={{ __html: Icons.zoomOut }} title="zoom out" />
              <button onClick={onZoomIn} dangerouslySetInnerHTML={{ __html: Icons.zoomIn }} title="zoom in" />
            </div>

            <div className='toolbar-spacing' dangerouslySetInnerHTML={{ __html: Icons.line }} />

            <div className="toolbar-group-align">
              <button onClick={onAlignLeft} dangerouslySetInnerHTML={{ __html: AlignIcons.left }} title="align left" />
              <button onClick={onAlignCenter} dangerouslySetInnerHTML={{ __html: AlignIcons.center }} title="align center" />
              <button onClick={onAlignRight} dangerouslySetInnerHTML={{ __html: AlignIcons.right }} title="align right" />
              <button onClick={onAlignTop} dangerouslySetInnerHTML={{ __html: AlignIcons.top }} title="align top" />
              <button onClick={onAlignMiddle} dangerouslySetInnerHTML={{ __html: AlignIcons.middle }} title="align middle" />
              <button onClick={onAlignBottom} dangerouslySetInnerHTML={{ __html: AlignIcons.bottom }} title="align bottom" />
            </div>

            <div className='toolbar-spacing' dangerouslySetInnerHTML={{ __html: Icons.line }} />

            <div className="toolbar-group-distribute">
              <button onClick={onDistributeHorizontally} dangerouslySetInnerHTML={{ __html: DistributeIcons.horizontal }} title="distribute horizontally" />
              <button onClick={onDistributeVertically} dangerouslySetInnerHTML={{ __html: DistributeIcons.vertical }} title="distribute vertically" />
            </div>
          </>
        )}
      </div>

      <div className="toolbar-right">
        {mode === 'editing' && ( // if editing
          <>
            <button onClick={onCancel} dangerouslySetInnerHTML={{ __html: Icons.cancel }} title="cancel" />
          </>
        )}
        {mode === "admin" && ( // if admin
          <button onClick={onDelete} dangerouslySetInnerHTML={{ __html: Icons.delete }} className='delete-button' title="delete"/>
        )}
        <button onClick={onContributor} dangerouslySetInnerHTML={{ __html: Icons.user }} title="contributors" />
        <button onClick={onExportClick} dangerouslySetInnerHTML={{ __html: Icons.export2 }} title="export" />
        {mode === "contributor" && ( // if contributor
          <>
            <button onClick={onCheckIn} dangerouslySetInnerHTML={{ __html: Icons.checkIn }} className='checkIn-button' title="check in" />
          </>
        )}
        {mode === 'editing' && ( // if editing
          <>
            <button onClick={onShare} dangerouslySetInnerHTML={{ __html: Icons.share }} className='share-button' title="request" />
            <button onClick={onSave} dangerouslySetInnerHTML={{ __html: Icons.save }} className='clipboard-button' title="save" />
          </>

        )}
        {mode === "admin" && isRequested === true && ( // if admin
          <button onClick={onPublish} dangerouslySetInnerHTML={{ __html: Icons.publish }} className='publish-button' title="publish"/>
        )}
      </div>


    </div>

  );
}

export default Toolbar;