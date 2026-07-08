declare global {
  interface SpotPlayerInstance {
    Open(licenseKey: string, courseId?: string | null, itemId?: string | number | null): Promise<void>;
    Stop(): Promise<void>;
    Hide(): Promise<void>;
    Destroy?(): void;
  }

  interface SpotPlayerConstructor {
    new (
      element: HTMLElement,
      cookieUrl: string,
      side?: boolean,
      cookieName?: string,
    ): SpotPlayerInstance;
  }

  interface SpotPlayerCourseItem {
    _id?: string;
    id?: string | number;
    name?: string;
    title?: string;
    duration?: number;
    type?: string | number;
    access?: boolean;
    items?: SpotPlayerCourseItem[];
  }

  interface SpotPlayerCourse {
    _id?: string;
    id?: string;
    name?: string;
    title?: string;
    items?: SpotPlayerCourseItem[];
  }

  interface Window {
    SpotPlayer?: SpotPlayerConstructor;
    spotplayer_courses?: SpotPlayerCourse[];
  }
}

export {};
