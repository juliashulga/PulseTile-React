import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';
import classNames from 'classnames';
import _ from 'lodash/fp';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { lifecycle, compose } from 'recompose';

import PluginListHeader from '../../plugin-page-component/PluginListHeader';
import PluginCreate from '../../plugin-page-component/PluginCreate';
import PluginMainPanel from '../../plugin-page-component/PluginMainPanel';
import PersonalNotesCreateForm from './PersonalNotesCreate/PersonalNotesCreateForm';
import { columnsConfig, defaultColumnsSelected } from './table-columns.config'
import { valuesNames } from './forms.config';
import { fetchPatientPersonalNotesRequest } from './ducks/fetch-patient-personal-notes.duck';
import { fetchPatientPersonalNotesDetailRequest } from './ducks/fetch-patient-personal-notes-detail.duck';
import { fetchPatientPersonalNotesDetailEditRequest } from './ducks/fetch-patient-personal-notes-detail-edit.duck';
import { fetchPatientPersonalNotesCreateRequest } from './ducks/fetch-patient-personal-notes-create.duck';
import { fetchPatientPersonalNotesOnMount } from '../../../utils/HOCs/fetch-patients.utils';
import { patientPersonalNotesSelector, patientPersonalNotesDetailSelector, personalNotePanelFormSelector, personalCreateFormStateSelector } from './selectors';
import { clientUrls } from '../../../config/client-urls.constants';
import PersonalNotesDetail from './PersonalNotesDetail/PersonalNotesDetail';
import { getDDMMMYYYY } from '../../../utils/time-helpers.utils';
import { checkIsValidateForm } from '../../../utils/plugin-helpers.utils';

const PERSONAL_NOTES_MAIN = 'personalNotesMain';
const PERSONAL_NOTES_DETAIL = 'personalNotesDetail';
const PERSONAL_NOTES_CREATE = 'personalNotesCreate';
const PERSONAL_NOTES_PANEL = 'personalNotesPanel';

const mapDispatchToProps = dispatch => ({ actions: bindActionCreators({ fetchPatientPersonalNotesRequest, fetchPatientPersonalNotesDetailRequest, fetchPatientPersonalNotesDetailEditRequest, fetchPatientPersonalNotesCreateRequest }, dispatch) });

@connect(patientPersonalNotesSelector, mapDispatchToProps)
@connect(patientPersonalNotesDetailSelector, mapDispatchToProps)
@connect(personalNotePanelFormSelector)
@connect(personalCreateFormStateSelector)
@compose(lifecycle(fetchPatientPersonalNotesOnMount))
export default class PersonalNotes extends PureComponent {
  static propTypes = {
    allPersonalNotes: PropTypes.arrayOf(PropTypes.object),
  };

  static contextTypes = {
    router: PropTypes.shape({
      history: PropTypes.object,
    }),
  };

  state = {
    nameShouldInclude: '',
    selectedColumns: defaultColumnsSelected,
    openedPanel: PERSONAL_NOTES_PANEL,
    columnNameSortBy: 'noteType',
    sortingOrder: 'asc',
    expandedPanel: 'all',
    isBtnCreateVisible: true,
    isBtnExpandVisible: false,
    isAllPanelsVisible: false,
    isDetailPanelVisible: false,
    isSecondPanel: false,
    isCreatePanelVisible: false,
    editedPanel: {},
    offset: 0,
    isSubmit: false,
  };

  componentWillReceiveProps() {
    const sourceId = this.context.router.route.match.params.sourceId;
    const userId = this.context.router.route.match.params.userId;
    if (this.context.router.history.location.pathname === `${clientUrls.PATIENTS}/${userId}/${clientUrls.PERSONAL_NOTES}/${sourceId}` && sourceId !== undefined) {
      this.setState({ isSecondPanel: true, isDetailPanelVisible: true, isBtnExpandVisible: true, isBtnCreateVisible: true, isCreatePanelVisible: false })
    }
  }

  handleExpand = (name, currentPanel) => {
    if (currentPanel === PERSONAL_NOTES_MAIN) {
      if (this.state.expandedPanel === 'all') {
        this.setState({ expandedPanel: name });
      } else {
        this.setState({ expandedPanel: 'all' });
      }
    } else if (this.state.expandedPanel === 'all') {
      this.setState({ expandedPanel: name, openedPanel: name });
    } else {
      this.setState({ expandedPanel: 'all' });
    }
  };

  handleFilterChange = ({ target: { value } }) => this.setState({ nameShouldInclude: _.toLower(value) });

  handleHeaderCellClick = (e, { name, sortingOrder }) => this.setState({ columnNameSortBy: name, sortingOrder });

  handleDetailPersonalNotesClick = (id, name, sourceId) => {
    const { actions, userId } = this.props;
    this.setState({ isSecondPanel: true, isDetailPanelVisible: true, isBtnExpandVisible: true, isBtnCreateVisible: true, isCreatePanelVisible: false, openedPanel: PERSONAL_NOTES_PANEL, editedPanel: {}, expandedPanel: 'all' });
    actions.fetchPatientPersonalNotesDetailRequest({ userId, sourceId });
    this.context.router.history.replace(`${clientUrls.PATIENTS}/${userId}/${clientUrls.PERSONAL_NOTES}/${sourceId}`);
  };

  filterAndSortPersonalNotes = (personalNotes) => {
    const { columnNameSortBy, sortingOrder, nameShouldInclude } = this.state;

    const filterByPersonalNotesTypePredicate = _.flow(_.get('noteType'), _.toLower, _.includes(nameShouldInclude));
    const filterByAuthorPredicate = _.flow(_.get('author'), _.toLower, _.includes(nameShouldInclude));
    const filterByDatePredicate = _.flow(_.get('dateCreated'), _.toLower, _.includes(nameShouldInclude));
    const filterBySourcePredicate = _.flow(_.get('source'), _.toLower, _.includes(nameShouldInclude));
    const reverseIfDescOrder = _.cond([
      [_.isEqual('desc'), () => _.reverse],
      [_.stubTrue, () => v => v],
    ])(sortingOrder);

    if (personalNotes !== undefined) {
      personalNotes.map((item) => {
        item.dateCreated = getDDMMMYYYY(item.dateCreated);
      });
    }

    const filterByPersonalNotesType = _.flow(_.sortBy([item => item[columnNameSortBy].toString().toLowerCase()]), reverseIfDescOrder, _.filter(filterByPersonalNotesTypePredicate))(personalNotes);
    const filterByAuthor = _.flow(_.sortBy([item => item[columnNameSortBy].toString().toLowerCase()]), reverseIfDescOrder, _.filter(filterByAuthorPredicate))(personalNotes);
    const filterByDate = _.flow(_.sortBy([item => new Date(item[columnNameSortBy]).getTime()]), reverseIfDescOrder, _.filter(filterByDatePredicate))(personalNotes);
    const filterBySource = _.flow(_.sortBy([columnNameSortBy]), reverseIfDescOrder, _.filter(filterBySourcePredicate))(personalNotes);

    const filteredAndSortedPersonalNotes = [filterByPersonalNotesType, filterByAuthor, filterByDate, filterBySource].filter((item) => {
      return _.size(item) !== 0;
    });

    if (columnNameSortBy === 'dateCreated') {
      return filterByDate
    }
    return _.head(filteredAndSortedPersonalNotes)
  };

  handleSetOffset = offset => this.setState({ offset });

  handleCreate = () => {
    const { userId } = this.props;
    this.setState({ isBtnCreateVisible: false, isCreatePanelVisible: true, openedPanel: PERSONAL_NOTES_CREATE, isSecondPanel: true, isDetailPanelVisible: false, isBtnExpandVisible: true, expandedPanel: 'all', isSubmit: false });
    this.context.router.history.replace(`${clientUrls.PATIENTS}/${userId}/${clientUrls.PERSONAL_NOTES}/create`);
  };

  handleEdit = (name) => {
    this.setState(prevState => ({
      editedPanel: {
        ...prevState.editedPanel,
        [name]: true,
      },
      isSubmit: false,
    }))
  };

  handlePersonalNotesDetailCancel = (name) => {
    this.setState(prevState => ({
      editedPanel: {
        ...prevState.editedPanel,
        [name]: false,
      },
      isSubmit: false,
    }))
  };

  handleSaveSettingsDetailForm = (formValues, name) => {
    const { actions, personalNoteFormState, userId, personalNoteDetail } = this.props;
    const sourceId = personalNoteDetail.sourceId;
    if (checkIsValidateForm(personalNoteFormState)) {
      actions.fetchPatientPersonalNotesDetailEditRequest(this.formValuesToString(formValues, 'edit'));
      setTimeout(() => {
        actions.fetchPatientPersonalNotesDetailRequest({ userId, sourceId });
        actions.fetchPatientPersonalNotesRequest({ userId });
      }, 2000);
      this.setState(prevState => ({
        editedPanel: {
          ...prevState.editedPanel,
          [name]: false,
        },
        isSubmit: false,
      }))
    } else {
      this.setState({ isSubmit: true });
    }
  };

  handleCreateCancel = () => {
    const { userId } = this.props;
    this.setState({ isBtnCreateVisible: true, isCreatePanelVisible: false, openedPanel: PERSONAL_NOTES_PANEL, isSecondPanel: false, isBtnExpandVisible: false, expandedPanel: 'all', isSubmit: false });
    this.context.router.history.replace(`${clientUrls.PATIENTS}/${userId}/${clientUrls.PERSONAL_NOTES}`);
  };

  handleSaveSettingsCreateForm = (formValues) => {
    const { actions, userId, personalCreateFormState } = this.props;
    if (checkIsValidateForm(personalCreateFormState)) {
      actions.fetchPatientPersonalNotesCreateRequest(this.formValuesToString(formValues, 'create'));
      setTimeout(() => actions.fetchPatientPersonalNotesRequest({userId}), 1000);
      this.context.router.history.replace(`${clientUrls.PATIENTS}/${userId}/${clientUrls.PERSONAL_NOTES}`);
      this.hideCreateForm();
    } else {
      this.setState({ isSubmit: true });
    }
  };

  formValuesToString = (formValues, formName) => {
    const { userId, personalNoteDetail } = this.props;
    const sendData = {};

    sendData.userId = userId;
    sendData[valuesNames.NOTE_TYPE] = formValues[valuesNames.NOTE_TYPE];
    sendData[valuesNames.NOTES] = formValues[valuesNames.NOTES];
    sendData[valuesNames.AUTHOR] = formValues[valuesNames.AUTHOR];

    if (formName === 'edit') {
      sendData[valuesNames.DATE] = formValues[valuesNames.DATE];
      sendData.sourceId = personalNoteDetail.sourceId;
      sendData.source = personalNoteDetail.source;
    }

    if (formName === 'create') {
      sendData.source = formValues[valuesNames.SOURCE];
    }

    return sendData;
  };

  hideCreateForm = () => {
    this.setState({ isBtnCreateVisible: true, isCreatePanelVisible: false, openedPanel: PERSONAL_NOTES_PANEL, isSecondPanel: false, expandedPanel: 'all', isBtnExpandVisible: false })
  };

  render() {
    const { selectedColumns, columnNameSortBy, sortingOrder, isSecondPanel, isDetailPanelVisible, isBtnExpandVisible, expandedPanel, openedPanel, isBtnCreateVisible, isCreatePanelVisible, editedPanel, offset, isSubmit } = this.state;
    const { allPersonalNotes, personalNoteDetail, personalNoteFormState, personalCreateFormState } = this.props;

    const isPanelDetails = (expandedPanel === PERSONAL_NOTES_DETAIL || expandedPanel === PERSONAL_NOTES_PANEL);
    const isPanelMain = (expandedPanel === PERSONAL_NOTES_MAIN);
    const isPanelCreate = (expandedPanel === PERSONAL_NOTES_CREATE);

    const columnsToShowConfig = columnsConfig.filter(columnConfig => selectedColumns[columnConfig.key]);

    const filteredPersonalNotes = this.filterAndSortPersonalNotes(allPersonalNotes);

    return (<section className="page-wrapper">
      <div className={classNames('section', { 'full-panel full-panel-main': isPanelMain, 'full-panel full-panel-details': (isPanelDetails || isPanelCreate) })}>
        <Row>
          {(isPanelMain || expandedPanel === 'all') ? <Col xs={12} className={classNames({ 'col-panel-main': isSecondPanel })}>
            <div className="panel panel-primary">
              <PluginListHeader
                onFilterChange={this.handleFilterChange}
                panelTitle="Personal Notes"
                isBtnExpandVisible={isBtnExpandVisible}
                name={PERSONAL_NOTES_MAIN}
                onExpand={this.handleExpand}
                currentPanel={PERSONAL_NOTES_MAIN}
              />
              <PluginMainPanel
                headers={columnsToShowConfig}
                resourceData={allPersonalNotes}
                emptyDataMessage="No personal notes"
                onHeaderCellClick={this.handleHeaderCellClick}
                onCellClick={this.handleDetailPersonalNotesClick}
                columnNameSortBy={columnNameSortBy}
                sortingOrder={sortingOrder}
                table="personalNotes"
                filteredData={filteredPersonalNotes}
                totalEntriesAmount={_.size(allPersonalNotes)}
                offset={offset}
                setOffset={this.handleSetOffset}
                isBtnCreateVisible={isBtnCreateVisible}
                onCreate={this.handleCreate}
              />
            </div>
          </Col> : null }
          {(expandedPanel === 'all' || isPanelDetails) && isDetailPanelVisible && !isCreatePanelVisible ? <Col xs={12} className={classNames({ 'col-panel-details': isSecondPanel })}>
            <PersonalNotesDetail
              onExpand={this.handleExpand}
              name={PERSONAL_NOTES_DETAIL}
              openedPanel={openedPanel}
              expandedPanel={expandedPanel}
              currentPanel={PERSONAL_NOTES_DETAIL}
              detail={personalNoteDetail}
              onEdit={this.handleEdit}
              editedPanel={editedPanel}
              onCancel={this.handlePersonalNotesDetailCancel}
              onSaveSettings={this.handleSaveSettingsDetailForm}
              personalNoteFormValues={personalNoteFormState.values}
              isSubmit={isSubmit}
            />
          </Col> : null}
          {(expandedPanel === 'all' || isPanelCreate) && isCreatePanelVisible && !isDetailPanelVisible ? <Col xs={12} className={classNames({ 'col-panel-details': isSecondPanel })}>
            <PluginCreate
              onExpand={this.handleExpand}
              name={PERSONAL_NOTES_CREATE}
              openedPanel={openedPanel}
              onShow={this.handleShow}
              expandedPanel={expandedPanel}
              currentPanel={PERSONAL_NOTES_CREATE}
              onSaveSettings={this.handleSaveSettingsCreateForm}
              formValues={personalCreateFormState.values}
              onCancel={this.handleCreateCancel}
              isCreatePanelVisible={isCreatePanelVisible}
              componentForm={
                <PersonalNotesCreateForm isSubmit={isSubmit} />
              }
              title="Create Personal Note"
            />
          </Col> : null}
        </Row>
      </div>
    </section>)
  }
}
