import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import ptBR from 'date-fns/locale/pt-BR';
import { format } from 'date-fns';
import { PrismicDocument, Query, RichTextField } from '@prismicio/types';
import { PrismicRichText } from '@prismicio/react';
import { predicate } from '@prismicio/client';
import { RichText } from 'prismic-dom';

import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: Record<string, unknown>[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post: propPost }: PostProps): JSX.Element {
  const { isFallback } = useRouter();

  const post = {
    ...propPost,
    first_publication_date: format(
      new Date(propPost.first_publication_date),
      'dd MMM yyyy',
      { locale: ptBR }
    ),
    minutes_lecture: propPost.data.content.reduce((minLecture, content) => {
      const size = RichText.asText(content.body).split(/[,.\s]/).length;

      /* eslint no-param-reassign: ["off"] */
      minLecture = Math.ceil(size / 200);
      return minLecture;
    }, 0),
  };

  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>

      <main>
        {isFallback ? (
          <div className={styles.postWait}>
            <h1>Carregando...</h1>
          </div>
        ) : (
          <>
            <Header />

            {post.data.banner.url && (
              <img
                className={styles.postBanner}
                src={post.data.banner.url}
                alt="banner"
              />
            )}

            <article
              className={`${commonStyles.contentContainer} ${styles.post}`}
            >
              <h1>{post.data.title}</h1>

              <div className={commonStyles.contentPostsAuthor}>
                <div>
                  <FiCalendar size="1.25rem" />
                  <time>{post.first_publication_date}</time>
                </div>
                <div>
                  <FiUser size="1.25rem" />
                  {post.data.author}
                </div>
                <div>
                  <FiClock size="1.25rem" />
                  {post.minutes_lecture} min
                </div>
              </div>

              <div className={styles.postContent}>
                {post.data.content.map(content => (
                  <div key={content.heading}>
                    <h2>{content.heading}</h2>
                    <PrismicRichText
                      field={content.body as unknown as RichTextField}
                    />
                  </div>
                ))}
              </div>
            </article>
          </>
        )}
      </main>
    </>
  );
}

/* eslint @typescript-eslint/no-explicit-any: ["off"] */
export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  let response: Query<PrismicDocument<Record<string, any>, string, string>>;

  if (!process.env.PRISMIC_OLD_VERSION) {
    response = await prismic.query('');
  } else {
    response = await prismic.get({
      predicates: [predicate.at('document.type', 'posts')],
      pageSize: 2,
    });
  }

  const paths = response.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: response.data,
  };

  return {
    props: {
      post,
    },
    redirect: 60 * 30, // 30 minutes
  };
};