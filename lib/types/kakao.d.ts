interface Window {
  Kakao?: {
    init: (key: string) => Promise<void>;
    isInitialized: () => boolean;
    Share: {
      sendDefault: (options: {
        objectType: string;
        content: {
          title: string;
          description: string;
          imageUrl?: string;
          link: {
            mobileWebUrl: string;
            webUrl: string;
          };
        };
        buttons: Array<{
          title: string;
          link: {
            mobileWebUrl: string;
            webUrl: string;
          };
        }>;
      }) => Promise<void>;
    };
  };
}
