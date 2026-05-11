'use client';

import { Flexbox } from '@lobehub/ui';
import { memo } from 'react';

import AgentSelect from './AgentSelect';
import InputArea from './InputArea';
import WelcomeText from './WelcomeText';

const Home = memo(() => {
  return (
    <Flexbox gap={40}>
      <Flexbox gap={24}>
        <Flexbox gap={8}>
          <AgentSelect />
          <WelcomeText />
        </Flexbox>
        <InputArea />
      </Flexbox>

      {/* Daily Brief is hidden for now; do not show it. */}
    </Flexbox>
  );
});

export default Home;
