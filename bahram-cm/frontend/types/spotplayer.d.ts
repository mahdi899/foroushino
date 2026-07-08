declare global {
  interface SpotPlayerInstance {
    Open(licenseKey: string, courseId: string, itemId?: string | number | null): Promise<void>;
    Destroy?(): void;
  }

  interface SpotPlayerConstructor {
    new (element: HTMLElement, syncUrl: string, autoOpen?: boolean): SpotPlayerInstance;
  }

  interface SpotPlayerCourseItem {
    id: string | number;
    title?: string;
    duration?: number;
    type?: string;
  }

  interface SpotPlayerCourse {
    id: string;
    title?: string;
    items?: SpotPlayerCourseItem[];
  }

  interface Window {
    SpotPlayer?: SpotPlayerConstructor;
    spotplayer_courses?: SpotPlayerCourse[];
  }
}

export {};
