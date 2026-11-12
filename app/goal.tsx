import { useGoal } from '@/src/viewmodels/goal/GoalProvider';
import { useGramAskPrice } from '@/src/viewmodels/goal/useGoalProgress';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { Screen } from '@/src/widgets/atoms/Screen';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { GoalForm } from '@/src/widgets/organisms/GoalForm';
import { router } from 'expo-router';
import React, { useState } from 'react';

export default function GoalScreen() {
  const { goal, saveGoal, clearGoal } = useGoal();
  const gramPrice = useGramAskPrice();
  const [saving, setSaving] = useState(false);

  return (
    <Screen scroll>
      <SectionHeader
        title={goal ? 'Hedefini düzenle' : 'Altın biriktirme hedefi'}
        subtitle="Dönem içinde kasana eklediğin alımlar hedefe sayılır"
      />
      <GoalForm
        initial={goal}
        gramPrice={gramPrice}
        submitLabel="Kaydet"
        submitting={saving}
        onSubmit={async (next) => {
          setSaving(true);
          try {
            await saveGoal(next);
            router.back();
          } finally {
            setSaving(false);
          }
        }}
      />
      {goal ? (
        <AppButton
          label="Hedefi kaldır"
          variant="danger"
          disabled={saving}
          onPress={async () => {
            await clearGoal();
            router.back();
          }}
        />
      ) : null}
    </Screen>
  );
}
