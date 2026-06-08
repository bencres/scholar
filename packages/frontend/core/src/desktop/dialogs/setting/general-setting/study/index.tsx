import { Switch } from '@affine/component';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { StudyService } from '@affine/core/modules/study';
import { STUDY_GENERATE_MODELS } from '@affine/core/modules/study/constants/generate-models';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';

import * as styles from './style.css';

export const StudySettings = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const generateModelId = useLiveData(studyService.generateModelId$);
  const defaultIncludeRecall = useLiveData(studyService.defaultIncludeRecall$);
  const defaultIncludeSynthesis = useLiveData(
    studyService.defaultIncludeSynthesis$
  );
  const defaultRecallCount = useLiveData(studyService.defaultRecallCount$);
  const defaultSynthesisCount = useLiveData(
    studyService.defaultSynthesisCount$
  );

  return (
    <>
      <SettingHeader
        title={t['com.affine.settings.study.title']()}
        subtitle={t['com.affine.settings.study.subtitle']()}
      />
      <SettingWrapper title={t['com.affine.settings.study.card-generation']()}>
        <SettingRow
          name={t['com.affine.settings.study.recall.name']()}
          desc={t['com.affine.settings.study.recall.desc']()}
        >
          <div className={styles.countControl}>
            <input
              type="number"
              className={styles.countInput}
              min={1}
              max={30}
              value={defaultRecallCount}
              disabled={!defaultIncludeRecall}
              onChange={e =>
                studyService.setDefaultRecallCount(Number(e.target.value))
              }
            />
            <Switch
              checked={defaultIncludeRecall}
              onChange={v => studyService.setDefaultIncludeRecall(v)}
            />
          </div>
        </SettingRow>
        <SettingRow
          name={t['com.affine.settings.study.synthesis.name']()}
          desc={t['com.affine.settings.study.synthesis.desc']()}
        >
          <div className={styles.countControl}>
            <input
              type="number"
              className={styles.countInput}
              min={1}
              max={30}
              value={defaultSynthesisCount}
              disabled={!defaultIncludeSynthesis}
              onChange={e =>
                studyService.setDefaultSynthesisCount(Number(e.target.value))
              }
            />
            <Switch
              checked={defaultIncludeSynthesis}
              onChange={v => studyService.setDefaultIncludeSynthesis(v)}
            />
          </div>
        </SettingRow>
        <SettingRow
          name={t['com.affine.settings.study.model.name']()}
          desc={t['com.affine.settings.study.model.desc']()}
        >
          <select
            className={styles.modelSelect}
            value={generateModelId}
            onChange={e => studyService.setGenerateModel(e.target.value)}
          >
            {STUDY_GENERATE_MODELS.map(model => (
              <option key={model.id} value={model.id}>
                {t[model.labelKey]()}
              </option>
            ))}
          </select>
        </SettingRow>
      </SettingWrapper>
    </>
  );
};
