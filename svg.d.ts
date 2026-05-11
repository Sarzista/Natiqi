declare module '*.svg' {
  import * as React from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}

declare module '*.wav' {
  const src: number;
  export default src;
}

declare module '*.gif' {
  const src: number;
  export default src;
}

