"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */

  getHostName() {
    return (new URL(this.url)).hostname;
  }

  /** Takes storyID, makes fetch request to API to get story data, and returns
   * new story instance created with story data. */
  static async getStoryById(storyId) {
    const resp = await fetch(`${BASE_URL}/stories/${storyId}`);
    const storyData = await resp.json();
    return new Story(storyData.story);
  }
}


/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await fetch(`${BASE_URL}/stories`, {
      method: "GET",
    });
    const storiesData = await response.json();

    // turn plain old story objects from API into instances of Story class
    const stories = storiesData.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);

  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  async addStory(user, story) {
    const response = await fetch(`${BASE_URL}/stories`, {
      method: "POST",
      body: JSON.stringify({ token: user.loginToken, story }),
      headers: {
        "Content-Type": "application/json"
      }
    });
    const storyData = await response.json();
    const storyInstance = new Story(storyData.story);
    this.stories.unshift(storyInstance);
    return storyInstance;
  }

  async getNextStoryIndex() {
    const storiesLen = this.stories.length;
    const qs = new URLSearchParams({skip: storiesLen-1, limit: 1});
    const resp = await fetch(`${BASE_URL}/stories?${qs}`, {
      method: "GET",
    });
    const storyData = await resp.json();
    const respStoryId = storyData.stories[0].storyId;
    if (respStoryId === this.stories[storiesLen-1].storyId) {
      return storiesLen;
    }

    //if fetched story exists in story list, know that there has been addition
    //else story has been deleted
    if (storyList.stories.some(story => story.storyId === respStoryId)) {

    } else {

    }
  }

  /** Makes call to API to get the next 25 stories, adds them to this.stories */

  async getExtraStories() {
    const nextStoryIndex = await this.getNextStoryIndex() || this.stories.length;
    console.log("stories length=",this.stories.length);
    console.log("next index=",nextStoryIndex);
    const qs = new URLSearchParams({skip: nextStoryIndex});
    const resp = await fetch(`${BASE_URL}/stories?${qs}`, {
      method: "GET",
    })
    const storiesData = await resp.json();

    const extraStories = storiesData.stories.map(story => new Story(story));

    this.stories = this.stories.concat(extraStories);
  }

}


/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */

  constructor({
    username,
    name,
    createdAt,
    favorites = [],
    ownStories = []
  },
    token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    const response = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      body: JSON.stringify({ user: { username, password, name } }),
      headers: {
        "content-type": "application/json",
      }
    });
    const userData = await response.json();
    const { user } = userData;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      userData.token
    );
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      body: JSON.stringify({ user: { username, password } }),
      headers: {
        "content-type": "application/json",
      }
    });
    const userData = await response.json();
    const { user } = userData;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      userData.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const tokenParams = new URLSearchParams({ token });

      const response = await fetch(
        `${BASE_URL}/users/${username}?${tokenParams}`,
        {
          method: "GET"
        }
      );
      const userData = await response.json();
      const { user } = userData;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  /** Sends POST request to add story to favorites and updates current
   * user instance's favorites. */

  async addFavorite(story) {
    const resp = await fetch(
      `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
      {
        method: "POST",
        body: JSON.stringify({ token: this.loginToken }),
        headers: { "Content-Type": "application/json" }
      });

    if (resp.ok) {
      this.favorites.push(story);
    } else {
      throw new Error("Add new favorite didn't work :(");
    }

  }


  /** Send DELETE request to remove story to favorites and updates current
  * user instance's favorites. */

  async removeFavorite(story) {
    const resp = await fetch(
      `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
      {
        method: "DELETE",
        body: JSON.stringify({ token: this.loginToken }),
        headers: { "Content-Type": "application/json" }
      });

    if (resp.ok) {
      // Remove the story from users favorites list that matches the input
      this.favorites = this.favorites.filter(favorite =>
          favorite.storyId !== story.storyId);
    } else {
      throw new Error("Remove favorite didn't work :(");
    }

  }
}
